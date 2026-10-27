import { beforeAll, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
import { initialState, transition } from "../src/lib/game/engine";
import {
  publicState,
  knowledge,
  investigationTool,
} from "../src/lib/server/projection";
import {
  askOperator,
  validateReply,
  type Provider,
} from "../src/lib/ai/operator";
import {
  createSession,
  getSession,
  submitAction,
  Conflict,
} from "../src/lib/db/store";
beforeAll(() => {
  process.env.DATABASE_PATH = join(
    tmpdir(),
    `dead-air-test-${randomUUID()}.sqlite`,
  );
});
describe("knowledge boundaries", () => {
  it("omits hidden documents and ending scenes from public state and inference context", () => {
    const s = initialState();
    for (const value of [publicState(s), knowledge(s, [])]) {
      const text = JSON.stringify(value);
      expect(text).not.toContain("kettle clicks");
      expect(text).not.toContain("I only ask");
      expect(text).not.toContain("A place for what remains");
    }
    expect(publicState(s).evidence.map((e) => e.id)).toEqual(["shutdown"]);
  });
  it("refuses undiscovered tools and traces", () => {
    expect(
      investigationTool(initialState(), "read_discovered_evidence", "request"),
    ).toHaveProperty("error");
    expect(
      investigationTool(initialState(), "inspect_observed_trace", "TRC-0001"),
    ).toHaveProperty("error");
  });
  it("rejects illegal suggestions and undiscovered citations", () => {
    const reply = {
      message: "Hello",
      evidenceIds: [],
      suggestedActionId: "silence",
      hintLevel: 1,
    };
    expect(() => validateReply(reply, initialState())).toThrow();
    expect(() =>
      validateReply(
        { ...reply, suggestedActionId: null, evidenceIds: ["request"] },
        initialState(),
      ),
    ).toThrow();
  });
});
describe("bounded provider behavior", () => {
  it("malformed output receives one repair then falls back without mutating progress", async () => {
    const s = transition(initialState(), "queue").nextState;
    const before = structuredClone(s);
    const complete = vi.fn().mockResolvedValue({ content: "not json" });
    const result = await askOperator(s, [], "Help", { complete });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(result.mode).toBe("Scripted fallback");
    expect(result.metadata.validation).toBe("fallback");
    expect(s).toEqual(before);
  });
  it("handles provider failure and records no invented usage", async () => {
    const result = await askOperator(initialState(), [], "Help", {
      complete: async () => {
        throw new Error("Provider HTTP 429.");
      },
    });
    expect(result.metadata.fallbackReason).toContain("429");
    expect(result.metadata).not.toHaveProperty("usage");
  });
  it("executes discovery-gated tool requests and validates the final reply", async () => {
    let calls = 0;
    const provider: Provider = {
      complete: async () => ({
        content: JSON.stringify(
          ++calls === 1
            ? { tools: [{ name: "read_discovered_evidence", id: "shutdown" }] }
            : {
                message:
                  "The company ceased trading in 2019. Inspect the queue.",
                evidenceIds: ["shutdown"],
                suggestedActionId: "queue",
                hintLevel: 1,
              },
        ),
      }),
    };
    const r = await askOperator(initialState(), [], "What happened?", provider);
    expect(r.metadata.validation).toBe("passed");
    expect(r.metadata.toolCalls).toHaveLength(1);
  });
  it("caps tools even when the model keeps asking", async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        tools: [{ name: "list_available_actions" }],
      }),
    });
    const r = await askOperator(initialState(), [], "Help", { complete });
    expect(r.mode).toBe("Scripted fallback");
    expect(r.metadata.toolCalls.length).toBeLessThanOrEqual(4);
    expect(complete.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
describe("SQLite authority", () => {
  it("persists sessions and deduplicates action IDs before version checks", () => {
    const id = randomUUID();
    createSession(id);
    const actionId = randomUUID();
    const first = submitAction(id, actionId, 0, "restart");
    const duplicate = submitAction(id, actionId, 0, "restart");
    expect(first.state.records).toHaveLength(2);
    expect(duplicate.state.version).toBe(1);
    expect(getSession(id)?.state).toEqual(first.state);
  });
  it("rejects stale concurrent updates", () => {
    const id = randomUUID();
    createSession(id);
    submitAction(id, randomUUID(), 0, "pause");
    expect(() => submitAction(id, randomUUID(), 0, "restart")).toThrow(
      Conflict,
    );
    expect(getSession(id)?.state.records).toHaveLength(1);
  });
});
