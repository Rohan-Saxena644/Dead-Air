import "server-only";
import { z } from "zod";
import { operatorConfig } from "./config";
import type { Provider, TokenUsage } from "./types";
import {
  googlePartSchema,
  investigationFunctions,
  nativeToolTransport,
} from "./google-tools";

const count = z.number().int().nonnegative();
const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(googlePartSchema).max(32),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .max(4)
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: count.optional(),
      candidatesTokenCount: count.optional(),
      totalTokenCount: count.optional(),
      thoughtsTokenCount: count.optional(),
      cachedContentTokenCount: count.optional(),
    })
    .optional(),
  modelVersion: z.string().max(150).optional(),
});
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      response.status === 429
        ? "Google quota or rate limit reached."
        : response.status === 401 || response.status === 403
          ? "Google authentication or access failed."
          : `Google HTTP ${response.status}.`,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty Google response.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 128_000) throw new Error("Google response exceeded limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Malformed Google response.");
  }
}
export function createGoogleProvider(config = operatorConfig()): Provider {
  const transport = nativeToolTransport();
  return {
    async complete(messages) {
      if (config.issue) throw new Error(config.issue);
      if (!config.apiKey) throw new Error("Google API key is missing.");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
        {
          method: "POST",
          signal: AbortSignal.timeout(12_000),
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    messages
                      .filter((m) => m.role === "system")
                      .map((m) => m.content)
                      .join("\n\n") +
                    "\nUse the declared native functions when investigating evidence, rather than emitting a JSON tools request. After tool results, return the final JSON answer schema described above. Never call operational tools; none are available.",
                },
              ],
            },
            contents: transport.contents(messages),
            tools: [{ functionDeclarations: investigationFunctions }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 768,
              ...(config.model.startsWith("gemma-4-")
                ? { thinkingConfig: { thinkingLevel: "minimal" } }
                : {}),
            },
          }),
        },
      );
      const parsed = responseSchema.safeParse(await boundedJson(response));
      if (!parsed.success) throw new Error("Malformed Google response.");
      const data = parsed.data;
      const candidate = data.candidates?.[0];
      if (
        data.promptFeedback?.blockReason ||
        candidate?.finishReason === "SAFETY"
      )
        throw new Error("Google declined to generate a response.");
      if (candidate?.finishReason === "MAX_TOKENS")
        throw new Error("Google response reached its output limit.");
      if (candidate?.finishReason !== "STOP")
        throw new Error("Google returned no complete answer.");
      const toolContent = transport.encode(candidate.content?.parts ?? []);
      const content =
        toolContent ??
        candidate.content?.parts
          .filter((p) => p.thought !== true)
          .map((p) => p.text ?? "")
          .join("");
      if (!content?.trim() || content.length > 12000)
        throw new Error("Google returned an empty or oversized answer.");
      const reported = data.usageMetadata;
      const usage: TokenUsage = {
        ...(reported?.promptTokenCount !== undefined
          ? { promptTokens: reported.promptTokenCount }
          : {}),
        ...(reported?.candidatesTokenCount !== undefined
          ? { completionTokens: reported.candidatesTokenCount }
          : {}),
        ...(reported?.totalTokenCount !== undefined
          ? { totalTokens: reported.totalTokenCount }
          : {}),
        ...(reported?.thoughtsTokenCount !== undefined
          ? { thoughtTokens: reported.thoughtsTokenCount }
          : {}),
        ...(reported?.cachedContentTokenCount !== undefined
          ? { cachedTokens: reported.cachedContentTokenCount }
          : {}),
      };
      return {
        content,
        ...(Object.keys(usage).length ? { usage } : {}),
        ...(data.modelVersion ? { modelVersion: data.modelVersion } : {}),
      };
    },
  };
}
