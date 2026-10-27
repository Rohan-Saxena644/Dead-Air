import { describe, expect, it } from "vitest";
import {
  initialState,
  transition,
  resolved,
  endingReady,
  parseCommand,
  type Action,
  type GameState,
} from "../src/lib/game/engine";
function run(actions: Action[], s = initialState()) {
  return actions.reduce((s, a) => transition(s, a).nextState, s);
}
function recovered(): GameState {
  return run([
    "queue",
    "trace",
    "pause",
    "idempotency",
    "repair",
    "resume",
    "archive",
    "read:manifest",
    "read:request",
  ]);
}
describe("at-least-once delivery", () => {
  it("commits before a failed ack and leaves the message pending", () => {
    const s = initialState();
    expect(s.records).toHaveLength(1);
    expect(s.queue.pending).toBe(true);
    expect(s.queue.attempts[0]).toMatchObject({
      committed: true,
      acknowledged: false,
    });
    expect(s.events.slice(-2).map((e) => e.service)).toEqual([
      "VAULT",
      "RELAY",
    ]);
  });
  it("retries append duplicates and an active restart immediately delivers", () => {
    const s = run(["advance", "restart"]);
    expect(s.records).toHaveLength(3);
    expect(s.queue.attempts).toHaveLength(3);
  });
  it("a paused restart and clock advance never deliver", () => {
    const s = run(["pause", "restart", "advance"]);
    expect(s.records).toHaveLength(1);
    expect(s.paused).toBe(true);
  });
  it("idempotency reuses the commit while ack failure keeps it pending", () => {
    const s = run(["idempotency", "restart"]);
    expect(s.records).toHaveLength(1);
    expect(s.queue.attempts[1]).toMatchObject({
      reused: true,
      acknowledged: false,
    });
    expect(s.queue.pending).toBe(true);
  });
  it("repair drains the queue and retains existing duplicates", () => {
    const s = run(["restart", "pause", "idempotency", "repair", "resume"]);
    expect(resolved(s)).toBe(true);
    expect(s.records).toHaveLength(2);
    expect(s.queue.attempts.at(-1)).toMatchObject({
      reused: true,
      acknowledged: true,
    });
  });
  it("has a complete solution with no restart mistake", () => {
    const s = recovered();
    expect(s.records).toHaveLength(1);
    expect(endingReady(s)).toBe(true);
  });
  it.each(["preserve", "silence"] as const)(
    "enforces prerequisites for %s and reaches its ending",
    (ending) => {
      expect(() => run([ending])).toThrow();
      expect(() =>
        run([
          "repair",
          "advance",
          "archive",
          "read:manifest",
          "read:request",
          ending,
        ]),
      ).toThrow();
      const s = transition(recovered(), ending).nextState;
      expect(s.ending).toBe(ending);
      expect(s.events.at(-2)?.text).toContain("Last buffered");
    },
  );
  it("requires reading the request, not just unlocking it", () => {
    const s = run([
      "idempotency",
      "repair",
      "advance",
      "archive",
      "read:manifest",
    ]);
    expect(endingReady(s)).toBe(false);
  });
  it("does not mutate input, use real time, or lose evidence on recovery", () => {
    const s = initialState();
    const copy = structuredClone(s);
    expect(transition(s, "restart")).toEqual(transition(s, "restart"));
    expect(s).toEqual(copy);
    expect(recovered().discovered).toContain("shutdown");
  });
  it("terminal accepts only fictional documented syntax", () => {
    expect(parseCommand("trace inspect TRC-0001")).toBe("trace:TRC-0001");
    expect(() => run(["trace:TRC-9999"])).toThrow();
    expect(parseCommand(" relay ACK-route repair ")).toBe("repair");
    expect(parseCommand("message inspect MSG-0917")).toBe("message");
    expect(parseCommand("rm -rf /")).toBeNull();
  });
});
