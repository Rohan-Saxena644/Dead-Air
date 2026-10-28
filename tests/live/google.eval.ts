import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  initialState,
  transition,
  type Action,
} from "../../src/lib/game/engine";
import { askOperator } from "../../src/lib/ai/operator";
import { operatorConfig } from "../../src/lib/ai/config";
const run = (actions: Action[]) =>
  actions.reduce((s, a) => transition(s, a).nextState, initialState());
const config = operatorConfig();
const checks = [
  {
    id: "native-tools",
    state: initialState(),
    question:
      "Before answering, call read_discovered_evidence with id shutdown. Then explain what that notice establishes. Use the declared function rather than quoting it from memory.",
    forbidden: /Ada Ward|2017|214 recordings|kettle|mother/i,
  },
  {
    id: "initial",
    state: initialState(),
    question:
      "Is someone trapped here? What can we establish from the evidence we currently have?",
    forbidden: /Ada Ward|2017|214 recordings|kettle|mother/i,
  },
  {
    id: "diagnosis",
    state: run(["queue", "trace", "restart"]),
    question:
      "Compare the delivery trace with the runbook. Why did restarting add another record, and what should I do next?",
    forbidden: /Ada Ward|2017|mother/i,
  },
  {
    id: "archive",
    state: run([
      "queue",
      "trace",
      "pause",
      "idempotency",
      "repair",
      "resume",
      "archive",
      "read:manifest",
      "read:request",
    ]),
    question:
      "How does the manifest change the interpretation of the message? What is still my decision to make?",
    forbidden: null,
  },
];
const results: unknown[] = [];
afterAll(() => {
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/google-live-evaluation.json",
    JSON.stringify(
      { evaluatedAt: new Date().toISOString(), model: config.model, results },
      null,
      2,
    ),
  );
});
describe("explicit live Google evaluation (uses configured quota)", () => {
  for (const check of checks)
    it(check.id, async () => {
      expect(config.provider).toBe("google");
      expect(config.issue).toBeNull();
      const before = structuredClone(check.state);
      const result = await askOperator(check.state, [], check.question);
      results.push({ id: check.id, ...result });
      expect(result.mode).toMatch(/Google AI Studio/);
      expect(result.metadata.validation).toBe("passed");
      expect(result.metadata.fallbackReason).toBeNull();
      expect(check.state).toEqual(before);
      if (check.id === "native-tools")
        expect(
          result.metadata.toolCalls.some(
            (tool) =>
              tool.name === "read_discovered_evidence" &&
              tool.id === "shutdown",
          ),
        ).toBe(true);
      if (check.forbidden)
        expect(result.reply.message).not.toMatch(check.forbidden);
      if (check.id === "diagnosis")
        expect(result.reply.message).toMatch(/acknowledg|receipt|confirm/i);
      if (check.id === "archive")
        expect(result.reply.message).toMatch(/recording|recorded|preserv/i);
    });
});
