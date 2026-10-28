import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createGoogleProvider } from "../src/lib/ai/google";
import {
  configuredMode,
  askOperator,
  scriptedReply,
} from "../src/lib/ai/operator";
import { DEFAULT_GOOGLE_MODEL } from "../src/lib/ai/config";
import { initialState, transition } from "../src/lib/game/engine";
const key = "test-only-secret";
const config = {
  provider: "google",
  model: DEFAULT_GOOGLE_MODEL,
  apiKey: key,
  issue: null,
};
const reply = {
  message: "Inspect the queue before drawing conclusions.",
  evidenceIds: [],
  suggestedActionId: "queue",
  hintLevel: 1,
};
const success = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: { parts: [{ text: JSON.stringify(reply) }] },
          finishReason: "STOP",
        },
      ],
      ...overrides,
    }),
  );
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Google provider boundary", () => {
  it("scripted recovery distinguishes a reused result from repair-first delivery", () => {
    let state = initialState();
    for (const action of ["repair", "advance", "idempotency"] as const)
      state = transition(state, action).nextState;
    expect(scriptedReply(state, "What happened?").message).not.toContain(
      "We reused",
    );
    expect(scriptedReply(state, "What happened?").message).toContain(
      "committed and acknowledged",
    );
  });
  it("uses header authentication, native Google roles, and only supplied context", async () => {
    const request = vi.fn().mockResolvedValue(
      success({
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 9,
          totalTokenCount: 21,
        },
        modelVersion: DEFAULT_GOOGLE_MODEL,
      }),
    );
    vi.stubGlobal("fetch", request);
    const result = await createGoogleProvider(config).complete([
      { role: "system", content: "Only known evidence." },
      { role: "user", content: "A known trace." },
      { role: "assistant", content: '{"tools":[]}' },
      { role: "user", content: "Controlled tool result." },
    ]);
    const [url, init] = request.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GOOGLE_MODEL}:generateContent`,
    );
    expect(url).not.toContain(key);
    expect(init.headers["x-goog-api-key"]).toBe(key);
    expect(body.systemInstruction.parts[0].text).toBe("Only known evidence.");
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual([
      "user",
      "model",
      "user",
    ]);
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe("minimal");
    expect(result.usage).toEqual({
      promptTokens: 12,
      completionTokens: 9,
      totalTokens: 21,
    });
    expect(result.modelVersion).toBe(DEFAULT_GOOGLE_MODEL);
  });
  it("does not expose thought parts or invent absent token counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    { thought: true, text: "private reasoning" },
                    { text: "visible answer" },
                  ],
                },
              },
            ],
          }),
        ),
      ),
    );
    const result = await createGoogleProvider(config).complete([
      { role: "user", content: "Hello" },
    ]);
    expect(result.content).toBe("visible answer");
    expect(result).not.toHaveProperty("usage");
  });
  it.each([400, 401, 403, 429, 500, 503])(
    "handles HTTP %s without exposing Google error bodies",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response(`Raw body with ${key}`, { status })),
      );
      try {
        await createGoogleProvider(config).complete([
          { role: "user", content: "Hello" },
        ]);
        throw new Error("Expected provider failure");
      } catch (error) {
        expect((error as Error).message).not.toContain(key);
        expect((error as Error).message).toMatch(/Google/);
      }
    },
  );
  it.each(["SAFETY", "MAX_TOKENS", "OTHER"])(
    "rejects incomplete or blocked output: %s",
    async (finishReason) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          success({
            candidates: [
              { content: { parts: [{ text: "partial" }] }, finishReason },
            ],
          }),
        ),
      );
      await expect(
        createGoogleProvider(config).complete([
          { role: "user", content: "Hello" },
        ]),
      ).rejects.toThrow(/Google/);
    },
  );
  it("bounds provider bytes and rejects malformed envelopes", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response("x".repeat(128001)))
      .mockResolvedValueOnce(new Response("{bad"))
      .mockResolvedValueOnce(success({ candidates: [] }));
    vi.stubGlobal("fetch", request);
    const provider = createGoogleProvider(config);
    await expect(
      provider.complete([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("exceeded limit");
    await expect(
      provider.complete([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("Malformed");
    await expect(
      provider.complete([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("no complete answer");
  });
  it("falls back after a timeout while preserving canonical state", async () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GEMINI_API_KEY", key);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );
    const state = transition(initialState(), "queue").nextState;
    const before = structuredClone(state);
    const result = await askOperator(state, [], "What next?");
    expect(result.mode).toBe("Scripted fallback");
    expect(result.metadata.fallbackReason).toBe("Provider timeout.");
    expect(state).toEqual(before);
  });
  it("uses honest configuration labels and performs no call without credentials", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(configuredMode()).toBe("Scripted fallback");
    expect(
      (await askOperator(initialState(), [], "Hello")).metadata.fallbackReason,
    ).toContain("key is missing");
    vi.stubEnv("GEMINI_API_KEY", key);
    expect(configuredMode()).toBe("Gemma · Google AI Studio");
    vi.stubEnv("GEMINI_MODEL", "gemini-example");
    expect(configuredMode()).toBe("Gemini · Google AI Studio");
    vi.stubEnv("AI_PROVIDER", "unsupported");
    expect(configuredMode()).toBe("Scripted fallback");
    await askOperator(initialState(), [], "Hello");
    expect(request).not.toHaveBeenCalled();
  });
  it("retains actual usage from every successful tool round", async () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GEMINI_API_KEY", key);
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        success({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      tools: [
                        { name: "read_discovered_evidence", id: "shutdown" },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        }),
      )
      .mockResolvedValueOnce(
        success({
          usageMetadata: {
            promptTokenCount: 20,
            candidatesTokenCount: 8,
            totalTokenCount: 28,
          },
        }),
      );
    vi.stubGlobal("fetch", request);
    const result = await askOperator(initialState(), [], "Help");
    expect(result.metadata.validation).toBe("passed");
    expect(result.metadata.calls).toHaveLength(2);
    expect(result.metadata.usage).toEqual({
      promptTokens: 30,
      completionTokens: 13,
      totalTokens: 43,
    });
    expect(result.mode).toBe("Gemma · Google AI Studio");
    expect(JSON.stringify(result.metadata)).not.toContain(key);
  });
});
