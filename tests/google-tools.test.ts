import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { nativeToolTransport } from "../src/lib/ai/google-tools";
import { createGoogleProvider } from "../src/lib/ai/google";
import { askOperator } from "../src/lib/ai/operator";
import { initialState } from "../src/lib/game/engine";
import { DEFAULT_GOOGLE_MODEL } from "../src/lib/ai/config";
describe("native Google investigation tools", () => {
  it("preserves signatures and repeated identical call turns in order", () => {
    const transport = nativeToolTransport();
    const first = transport.encode([
      {
        functionCall: {
          name: "read_discovered_evidence",
          args: { id: "shutdown" },
          id: "one",
        },
        thoughtSignature: "signature-one",
      },
    ])!;
    const second = transport.encode([
      {
        functionCall: {
          name: "read_discovered_evidence",
          args: { id: "shutdown" },
          id: "two",
        },
        thoughtSignature: "signature-two",
      },
    ])!;
    expect(first).toBe(second);
    const result = JSON.stringify({
      toolResults: [
        { name: "read_discovered_evidence", result: { title: "Known notice" } },
      ],
      instruction: "Return final answer.",
    });
    const contents = transport.contents([
      { role: "user", content: "Question" },
      { role: "assistant", content: first },
      { role: "user", content: result },
      { role: "assistant", content: second },
      { role: "user", content: result },
    ]);
    expect(contents[1].parts[0]).toHaveProperty(
      "thoughtSignature",
      "signature-one",
    );
    expect(contents[3].parts[0]).toHaveProperty(
      "thoughtSignature",
      "signature-two",
    );
    expect(contents[2].parts[0]).toHaveProperty("functionResponse.id", "one");
    expect(contents[4].parts[0]).toHaveProperty("functionResponse.id", "two");
  });
  it("sends discovery-denied function results back to Google and exposes no raw transport metadata", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      functionCall: {
                        name: "read_discovered_evidence",
                        args: { id: "request" },
                        id: "call-one",
                      },
                      thoughtSignature: "private-signature",
                    },
                  ],
                },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        message:
                          "That evidence is not available. Inspect the queue.",
                        evidenceIds: [],
                        suggestedActionId: "queue",
                        hintLevel: 1,
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        ),
      );
    vi.stubGlobal("fetch", request);
    try {
      const provider = createGoogleProvider({
        provider: "google",
        model: DEFAULT_GOOGLE_MODEL,
        apiKey: "fixture-secret",
        issue: null,
      });
      const result = await askOperator(
        initialState(),
        [],
        "Read the final request.",
        provider,
      );
      expect(result.metadata.validation).toBe("passed");
      const body = JSON.parse(request.mock.calls[1][1].body);
      const reply = body.contents.at(-1).parts[0].functionResponse;
      expect(reply.name).toBe("read_discovered_evidence");
      expect(reply.response.result.error).toContain("undiscovered");
      expect(JSON.stringify(result)).not.toContain("private-signature");
      expect(
        body.tools[0].functionDeclarations.map(
          (tool: { name: string }) => tool.name,
        ),
      ).toEqual([
        "read_discovered_evidence",
        "inspect_observed_trace",
        "summarize_recent_events",
        "list_available_actions",
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
