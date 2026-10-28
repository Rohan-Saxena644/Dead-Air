import { describe, expect, it } from "vitest";
import {
  initialState,
  legalActions,
  transition,
  type Action,
  type GameState,
} from "../src/lib/game/engine";
import { actionReport, notebookGuide } from "../src/lib/game/notebook";
const run = (actions: Action[], state = initialState()) =>
  actions.reduce((s, a) => transition(s, a).nextState, state);
describe("evidence-aware investigation plan", () => {
  it("reveals no recovery procedure or hidden story before its source is read", () => {
    for (const state of [
      initialState(),
      run(["queue"]),
      run(["queue", "trace"]),
    ]) {
      const guide = notebookGuide(state);
      expect(guide.phase).toBe("investigate");
      expect(JSON.stringify(guide)).not.toMatch(
        /idempotency|Elena|2017|final request|preserve|silence/i,
      );
      for (const step of guide.steps)
        if (step.evidenceId)
          expect(state.discovered).toContain(step.evidenceId);
      expect(legalActions(state)).toContain(guide.nextAction);
    }
  });
  it("provides a complete legal route from an initial save without a restart", () => {
    let state = initialState();
    for (let i = 0; i < 14; i++) {
      const guide = notebookGuide(state);
      if (!guide.nextAction) break;
      expect(legalActions(state)).toContain(guide.nextAction);
      state = transition(state, guide.nextAction).nextState;
    }
    const guide = notebookGuide(state);
    expect(guide.phase).toBe("handover");
    expect(guide.nextAction).toBeNull();
    expect(state.records).toHaveLength(1);
    expect(legalActions(state)).toContain("preserve");
    expect(guide.steps.every((step) => step.complete)).toBe(true);
  });
  it("does not force a pause or another write after a repair-first recovery", () => {
    const state = run(["queue", "trace", "read:runbook", "repair", "advance"]);
    const guide = notebookGuide(state);
    expect(guide.nextAction).toBe("idempotency");
    expect(guide.steps.find((step) => step.id === "contain")?.complete).toBe(
      true,
    );
    const after = transition(state, "idempotency").nextState;
    expect(notebookGuide(after).phase).toBe("handover");
    expect(after.records).toHaveLength(state.records.length);
  });
  it("restores checklist progress from canonical state and accepts a solved incident without reading the runbook", () => {
    const state = run(["idempotency", "repair", "advance"]);
    expect(
      notebookGuide(JSON.parse(JSON.stringify(state)) as GameState),
    ).toEqual(notebookGuide(state));
    expect(notebookGuide(state).nextAction).toBe("archive");
  });
});
describe("operational consequence reports", () => {
  it("distinguishes an active duplicate from a paused restart", () => {
    const state = initialState();
    const duplicate = actionReport(
      state,
      transition(state, "restart").nextState,
      "restart",
    )!;
    expect(duplicate).toMatchObject({
      tone: "warning",
      attemptsAdded: 1,
      recordsAdded: 1,
      pending: true,
    });
    const paused = run(["pause"]);
    expect(
      actionReport(paused, transition(paused, "restart").nextState, "restart"),
    ).toMatchObject({ attemptsAdded: 0, recordsAdded: 0, pending: true });
  });
  it("never reports a route repair as a completed delivery and verifies real reuse on resume", () => {
    const paused = run(["pause", "idempotency"]);
    const repaired = transition(paused, "repair").nextState;
    expect(actionReport(paused, repaired, "repair")).toMatchObject({
      attemptsAdded: 0,
      recordsAdded: 0,
      pending: true,
    });
    const report = actionReport(
      repaired,
      transition(repaired, "resume").nextState,
      "resume",
    )!;
    expect(report).toMatchObject({
      tone: "success",
      attemptsAdded: 1,
      recordsAdded: 0,
      pending: false,
    });
    expect(report.detail).toContain("reused");
  });
  it("does not announce routine inspection or automatic ticks", () => {
    const state = initialState();
    expect(
      actionReport(state, transition(state, "advance").nextState, "advance"),
    ).toBeNull();
    expect(
      actionReport(state, transition(state, "queue").nextState, "queue"),
    ).toBeNull();
  });
});
