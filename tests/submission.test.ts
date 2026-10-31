import { beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initialState,
  legalActions,
  outcome,
  transition,
  type Action,
} from "../src/lib/game/engine";
import { askOperator, scriptedReply } from "../src/lib/ai/operator";
import {
  createSession,
  database,
  getSession,
  releaseAi,
  reserveAi,
  submitAction,
} from "../src/lib/db/store";
beforeAll(() => {
  process.env.DATABASE_PATH = join(
    tmpdir(),
    `dead-air-submission-${randomUUID()}.sqlite`,
  );
});
const recovery: Action[] = [
  "queue",
  "trace",
  "pause",
  "idempotency",
  "repair",
  "resume",
  "archive",
  "read:manifest",
  "read:request",
];
for (const ending of ["preserve", "silence"] as const)
  for (const prepared of [false, true]) {
    it(`persists ${ending} ${prepared ? "with" : "without"} verified handover and retains fallback evidence boundaries`, async () => {
      const id = randomUUID();
      let s = createSession(id);
      const actions: Action[] = [
        ...recovery,
        ...(prepared
          ? (["read:custody", "verify-source", "prepare-handover"] as Action[])
          : []),
        ending,
      ];
      for (const a of actions)
        s = submitAction(id, randomUUID(), s.version, a).state;
      const restored = getSession(id)!.state;
      expect(restored).toEqual(s);
      expect(outcome(restored)).toBe(
        ending === "preserve"
          ? prepared
            ? "preserve_verified"
            : "preserve_sealed"
          : prepared
            ? "silence_handover"
            : "silence_unprepared",
      );
      expect(restored.records).toHaveLength(1);
      const reply = scriptedReply(restored, "What now?");
      expect(reply.suggestedActionId).toBeNull();
      expect(
        reply.evidenceIds.every((e) =>
          restored.discovered.includes(e as never),
        ),
      ).toBe(true);
    });
  }
it("rejects premature handover, challenges incorrect interpretation, and allows reversing preparation without losing evidence", () => {
  let s = initialState();
  expect(() => transition(s, "prepare-handover")).toThrow();
  for (const a of [...recovery, "read:custody", "verify-delivery"] as Action[])
    s = transition(s, a).nextState;
  expect(legalActions(s)).not.toContain("prepare-handover");
  expect(s.events.at(-1)!.text).toContain("not a contributor");
  for (const a of [
    "verify-source",
    "prepare-handover",
    "seal-attribution",
  ] as Action[])
    s = transition(s, a).nextState;
  expect(s.milestones).not.toContain("handover-prepared");
  expect(legalActions(s)).toContain("read:custody");
});
it("keeps hints progressive in scripted mode and reacts to safe containment", () => {
  const s = transition(
    transition(initialState(), "trace").nextState,
    "pause",
  ).nextState;
  const first = scriptedReply(s, "Help");
  expect(first.message).toContain("Which theory");
  expect(first.message).toContain("Your pause contained");
  expect(first.message).not.toContain("enable idempotency");
  const next = scriptedReply(s, "Another hint", [
    { role: "user", message: "Help" },
  ]);
  expect(next.suggestedActionId).toBe("read:runbook");
  expect(scriptedReply(s, "Give exact repair steps").hintLevel).toBe(3);
});
it("bounds the whole operator turn even if an injected provider ignores cancellation", async () => {
  vi.useFakeTimers();
  try {
    const pending = askOperator(initialState(), [], "Help", {
      complete: () => new Promise(() => {}),
    });
    await vi.advanceTimersByTimeAsync(30_001);
    const result = await pending;
    expect(result.mode).toBe("Scripted fallback");
    expect(result.metadata.durationMs).toBe(30_000);
    expect(result.metadata.fallbackReason).toContain("timeout");
  } finally {
    vi.useRealTimers();
  }
});
it("reserves one model turn per session and two globally, with a shared hourly budget", () => {
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  ids.forEach(createSession);
  expect(reserveAi(ids[0])).toBe(true);
  expect(reserveAi(ids[0])).toBe(false);
  expect(reserveAi(ids[1])).toBe(true);
  expect(reserveAi(ids[2])).toBe(false);
  releaseAi(ids[0]);
  expect(reserveAi(ids[2])).toBe(true);
  releaseAi(ids[1]);
  releaseAi(ids[2]);
  database().prepare("UPDATE ai_budget SET turns=120 WHERE id=1").run();
  const fresh = randomUUID();
  createSession(fresh);
  expect(reserveAi(fresh)).toBe(false);
});
