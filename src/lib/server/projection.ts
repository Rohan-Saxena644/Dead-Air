import "server-only";
import {
  endingReady,
  legalActions,
  objective,
  services,
  type GameState,
} from "../game/engine";
import { evidence, endings } from "../scenarios/episode";
export function publicState(s: GameState) {
  return {
    ...s,
    evidence: s.discovered.map((id) => evidence[id]),
    services: services(s),
    objective: objective(s),
    legalActions: legalActions(s),
    endingReady: endingReady(s),
    finalScene: s.ending ? endings[s.ending] : null,
  };
}
export type PublicState = ReturnType<typeof publicState>;
export interface Conversation {
  role: "user" | "assistant";
  message: string;
  evidenceIds?: string[];
  suggestedActionId?: string | null;
  mode?: string;
}
export function knowledge(s: GameState, conversation: Conversation[]) {
  return {
    observedEvents: s.events.slice(-24),
    discoveredEvidence: s.discovered.map((id) => evidence[id]),
    publicServices: services(s),
    queue: s.queue,
    records: s.records,
    legalActions: legalActions(s),
    objective: objective(s),
    unlockedFacts: s.milestones,
    recentConversation: conversation.slice(-8),
    previousActions: s.actions,
  };
}
export function investigationTool(s: GameState, name: string, id?: string) {
  switch (name) {
    case "read_discovered_evidence":
      return s.discovered.includes(id as (typeof s.discovered)[number])
        ? evidence[id as (typeof s.discovered)[number]]
        : { error: "Evidence unavailable or undiscovered." };
    case "inspect_observed_trace":
      return s.discovered.includes("delivery") &&
        s.queue.attempts.some((a) => a.id === id)
        ? s.queue.attempts.find((a) => a.id === id)
        : { error: "Trace unavailable or unobserved." };
    case "summarize_recent_events":
      return s.events.slice(-12);
    case "list_available_actions":
      return legalActions(s);
    default:
      return { error: "Unknown investigation tool." };
  }
}
