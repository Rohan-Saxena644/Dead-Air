import "server-only";
import { z } from "zod";
import type { ModelMessage } from "./types";

export const googlePartSchema = z
  .object({
    text: z.string().optional(),
    thought: z.boolean().optional(),
    thoughtSignature: z.string().optional(),
    functionCall: z
      .object({
        name: z.string().max(100),
        args: z.record(z.string(), z.unknown()).optional(),
        id: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();
type GooglePart = z.infer<typeof googlePartSchema>;
type GoogleContent = { role: "user" | "model"; parts: unknown[] };
interface NativeTurn {
  encoded: string;
  parts: GooglePart[];
  calls: NonNullable<GooglePart["functionCall"]>[];
}
export const investigationFunctions = [
  {
    name: "read_discovered_evidence",
    description:
      "Read an evidence document already discovered by this player. Undiscovered IDs are refused.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "Discovered evidence ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "inspect_observed_trace",
    description:
      "Read a trace already observed by this player. Unknown or unobserved IDs are refused.",
    parameters: {
      type: "OBJECT",
      properties: { id: { type: "STRING", description: "Observed trace ID" } },
      required: ["id"],
    },
  },
  {
    name: "summarize_recent_events",
    description:
      "Read recent observed simulation events. This does not advance time or perform actions.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "list_available_actions",
    description:
      "List currently legal actions for the player to consider. This never performs an action.",
    parameters: { type: "OBJECT", properties: {} },
  },
];
const resultsSchema = z.object({
  toolResults: z.array(z.object({ name: z.string(), result: z.unknown() })),
  instruction: z.string(),
});

// Ephemeral transport history for one bounded operator invocation. Raw model turns
// preserve Google's function-call IDs/signatures, never entering public state or logs.
export function nativeToolTransport() {
  const turns: NativeTurn[] = [];
  return {
    encode(parts: GooglePart[]): string | null {
      const calls = parts.flatMap((part) =>
        part.functionCall ? [part.functionCall] : [],
      );
      if (!calls.length) return null;
      const encoded = JSON.stringify({
        tools: calls.map((call) => ({
          name: call.name,
          ...(call.args?.id !== undefined ? { id: call.args.id } : {}),
        })),
      });
      turns.push({ encoded, parts, calls });
      return encoded;
    },
    contents(messages: ModelMessage[]): GoogleContent[] {
      let cursor = 0;
      let previous: NativeTurn | undefined;
      return messages
        .filter((message) => message.role !== "system")
        .map((message) => {
          if (message.role === "assistant") {
            const index = turns.findIndex(
              (turn, i) => i >= cursor && turn.encoded === message.content,
            );
            if (index >= 0) {
              cursor = index + 1;
              previous = turns[index];
              return { role: "model", parts: previous.parts };
            }
          }
          if (message.role === "user" && previous) {
            let value: unknown;
            try {
              value = JSON.parse(message.content);
            } catch {
              value = null;
            }
            const parsed = resultsSchema.safeParse(value);
            if (
              parsed.success &&
              parsed.data.toolResults.length === previous.calls.length &&
              parsed.data.toolResults.every(
                (result, i) => result.name === previous!.calls[i].name,
              )
            ) {
              const calls = previous.calls;
              return {
                role: "user",
                parts: [
                  ...parsed.data.toolResults.map((result, i) => ({
                    functionResponse: {
                      name: result.name,
                      ...(calls[i].id ? { id: calls[i].id } : {}),
                      response: { result: result.result },
                    },
                  })),
                  { text: parsed.data.instruction },
                ],
              };
            }
          }
          return {
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          };
        });
    },
  };
}
