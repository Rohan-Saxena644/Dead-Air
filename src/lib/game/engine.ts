export const evidenceIds = [
  "shutdown",
  "delivery",
  "queue",
  "ack",
  "runbook",
  "letter",
  "manifest",
  "request",
  "recording",
  "custody",
] as const;
export type EvidenceId = (typeof evidenceIds)[number];
export type ServiceName = "LISTENER" | "RELAY" | "VAULT";
export type Ending = "preserve" | "silence";
export type Action =
  | "status"
  | "logs"
  | "queue"
  | "message"
  | "trace"
  | "restart"
  | "pause"
  | "resume"
  | "idempotency"
  | "repair"
  | "archive"
  | "advance"
  | "preserve"
  | "silence"
  | "verify-source"
  | "verify-delivery"
  | "prepare-handover"
  | "seal-attribution"
  | `trace:${string}`
  | `read:${EvidenceId}`
  | `pin:${EvidenceId}`;
export interface Attempt {
  id: string;
  time: number;
  committed: boolean;
  reused: boolean;
  acknowledged: boolean;
}
export interface DeliveryRecord {
  id: string;
  messageId: string;
  time: number;
  attemptId: string;
}
export interface GameEvent {
  id: number;
  time: number;
  service: ServiceName | "SYSTEM";
  level: "info" | "warn" | "error";
  text: string;
  traceId?: string;
}
export interface ServiceState {
  name: ServiceName;
  status: "online" | "degraded" | "offline" | "read-only";
}
export interface GameState {
  schemaVersion: 1;
  version: number;
  time: number;
  paused: boolean;
  idempotency: boolean;
  ackHealthy: boolean;
  queue: { id: string; pending: boolean; attempts: Attempt[] };
  records: DeliveryRecord[];
  discovered: EvidenceId[];
  pinned: EvidenceId[];
  milestones: string[];
  events: GameEvent[];
  actions: Partial<Record<Action, number>>;
  ending: Ending | null;
}
export const MESSAGE_ID = "MSG-0917";
export const START_TIME = "2026-10-27T02:13:00Z";
export function timeLabel(seconds: number) {
  return new Date(Date.parse(START_TIME) + seconds * 1000)
    .toISOString()
    .slice(11, 19);
}
function emit(
  s: GameState,
  service: GameEvent["service"],
  level: GameEvent["level"],
  text: string,
  traceId?: string,
) {
  s.events.push({
    id: s.events.length + 1,
    time: s.time,
    service,
    level,
    text,
    ...(traceId ? { traceId } : {}),
  });
}
function discover(s: GameState, ...ids: EvidenceId[]) {
  for (const id of ids) if (!s.discovered.includes(id)) s.discovered.push(id);
}
function deliver(s: GameState) {
  if (s.paused || !s.queue.pending || s.ending) return;
  const id = `TRC-${String(s.queue.attempts.length + 1).padStart(4, "0")}`;
  const reused = s.idempotency && s.records.length > 0;
  s.queue.attempts.push({
    id,
    time: s.time,
    committed: true,
    reused,
    acknowledged: s.ackHealthy,
  });
  if (!reused)
    s.records.push({
      id: `DLV-${String(s.records.length + 1).padStart(4, "0")}`,
      messageId: MESSAGE_ID,
      time: s.time,
      attemptId: id,
    });
  emit(
    s,
    "VAULT",
    "info",
    reused
      ? "Existing committed result reused. No new archive record."
      : `Delivery committed · ${MESSAGE_ID} · record ${s.records.length}`,
    id,
  );
  if (s.ackHealthy) {
    s.queue.pending = false;
    emit(
      s,
      "RELAY",
      "info",
      "Acknowledgement received. Pending message removed from queue.",
      id,
    );
  } else
    emit(
      s,
      "RELAY",
      "error",
      "ACK timeout after commit. Message retained; retry scheduled.",
      id,
    );
}
function observeTrace(s: GameState, id?: string) {
  const attempt = id
    ? s.queue.attempts.find((a) => a.id === id)
    : s.queue.attempts.at(-1);
  if (!attempt)
    throw new Error("Trace not found. Use an ID from the delivery history.");
  discover(s, "delivery", "ack", "runbook");
  emit(
    s,
    "RELAY",
    attempt.acknowledged ? "info" : "warn",
    `Trace ${attempt.id}: ${attempt.reused ? "existing commit reused" : "VAULT commit"} → ${attempt.acknowledged ? "/v2/ack confirmed" : "retired /v1/receipt timed out"}. Runbook available.`,
    attempt.id,
  );
}
export function initialState(): GameState {
  const s: GameState = {
    schemaVersion: 1,
    version: 0,
    time: 0,
    paused: false,
    idempotency: false,
    ackHealthy: false,
    queue: { id: MESSAGE_ID, pending: true, attempts: [] },
    records: [],
    discovered: ["shutdown"],
    pinned: [],
    milestones: [],
    events: [],
    actions: {},
    ending: null,
  };
  emit(
    s,
    "SYSTEM",
    "warn",
    "Connection established to Meridian Systems. Decommission record: 2019-10-31.",
  );
  emit(
    s,
    "LISTENER",
    "warn",
    "Buffered recording received: “Please don’t shut it down. I’m still here.”",
  );
  deliver(s);
  return s;
}
export function resolved(s: GameState) {
  return s.idempotency && s.ackHealthy && !s.queue.pending;
}
export function endingReady(s: GameState) {
  return (
    resolved(s) &&
    ["manifest", "request"].every((id) =>
      s.discovered.includes(id as EvidenceId),
    ) &&
    (s.actions["read:request"] ?? 0) > 0
  );
}
export const outcomeIds = [
  "preserve_verified",
  "preserve_sealed",
  "silence_handover",
  "silence_unprepared",
] as const;
export type OutcomeId = (typeof outcomeIds)[number];
export function handoverPrepared(s: GameState) {
  return s.milestones.includes("handover-prepared");
}
export function outcome(s: GameState): OutcomeId | null {
  return s.ending === "preserve"
    ? handoverPrepared(s)
      ? "preserve_verified"
      : "preserve_sealed"
    : s.ending === "silence"
      ? handoverPrepared(s)
        ? "silence_handover"
        : "silence_unprepared"
      : null;
}
export function services(s: GameState): ServiceState[] {
  return [
    { name: "LISTENER", status: s.ending ? "offline" : "online" },
    {
      name: "RELAY",
      status: s.ending ? "offline" : resolved(s) ? "online" : "degraded",
    },
    {
      name: "VAULT",
      status:
        s.ending === "silence"
          ? "offline"
          : s.ending === "preserve"
            ? "read-only"
            : "online",
    },
  ];
}
export function legalActions(s: GameState): Action[] {
  if (s.ending) return [];
  return [
    "status",
    "logs",
    "queue",
    "message",
    "trace",
    ...s.queue.attempts.map((a) => `trace:${a.id}` as Action),
    "restart",
    s.paused ? "resume" : "pause",
    ...(!s.idempotency ? ["idempotency" as const] : []),
    ...(!s.ackHealthy ? ["repair" as const] : []),
    "archive",
    "advance",
    ...s.discovered.map((id) => `read:${id}` as Action),
    ...(endingReady(s) ? (["preserve", "silence"] as const) : []),
    ...(endingReady(s) && (s.actions["read:custody"] ?? 0) > 0
      ? (["verify-source", "verify-delivery", "seal-attribution"] as const)
      : []),
    ...(endingReady(s) &&
    s.milestones.includes("source-compared") &&
    !handoverPrepared(s)
      ? (["prepare-handover"] as const)
      : []),
  ];
}
export function objective(s: GameState) {
  if (s.ending)
    return "Investigation complete. Your handover has been recorded.";
  if (!s.discovered.includes("queue"))
    return "Inspect the delivery queue. Find out what is still trying to leave.";
  if (!s.discovered.includes("ack"))
    return "Follow a delivery trace. Did the message fail, or only its acknowledgement?";
  if (!s.idempotency || !s.ackHealthy)
    return "Compare the committed write with its missing receipt. Find a safe recovery in the recovered runbook.";
  if (s.queue.pending)
    return "Resume delivery to verify one safe, acknowledged attempt.";
  if (!endingReady(s))
    return "The incident is stable. Read the archive manifest and final preservation request.";
  return "The obligation is yours now. Preserve the archive, or finish the shutdown.";
}
export function transition(
  state: GameState,
  action: Action,
): { nextState: GameState; events: GameEvent[] } {
  if (state.ending)
    throw new Error("This investigation is complete. Replay to begin again.");
  const s = structuredClone(state);
  const before = s.events.length;
  if (action.startsWith("pin:")) {
    const id = action.slice(4) as EvidenceId;
    if (!s.discovered.includes(id))
      throw new Error("Evidence has not been discovered.");
    s.pinned = s.pinned.includes(id)
      ? s.pinned.filter((x) => x !== id)
      : [...s.pinned, id];
  } else {
    if (!legalActions(s).includes(action))
      throw new Error(
        "That action is not available. Inspect the evidence and current objective.",
      );
    s.time += action === "advance" ? 20 : 4;
    s.actions[action] = (s.actions[action] ?? 0) + 1;
    switch (action) {
      case "status":
        emit(
          s,
          "SYSTEM",
          "info",
          `Status inspected. Delivery ${s.paused ? "paused" : "active"}; ACK route ${s.ackHealthy ? "healthy" : "broken"}.`,
        );
        break;
      case "logs":
        discover(s, "delivery");
        emit(
          s,
          "RELAY",
          "info",
          "Delivery log opened. A commit precedes every failed acknowledgement.",
        );
        break;
      case "queue":
        discover(s, "queue");
        emit(
          s,
          "RELAY",
          "info",
          `${MESSAGE_ID}: ${s.queue.pending ? "pending" : "acknowledged"} · ${s.queue.attempts.length} attempts · origin 2019-10-31 18:42:07 UTC.`,
        );
        break;
      case "message":
        discover(s, "queue", "delivery");
        emit(
          s,
          "LISTENER",
          "info",
          "Message inspected. Payload is a preserved recording segment, timestamped 2019-10-31.",
        );
        break;
      case "trace":
        observeTrace(s);
        break;
      case "restart":
        emit(
          s,
          "RELAY",
          "warn",
          s.paused
            ? "Worker restarted. Delivery remains paused."
            : "Worker restarted. Immediate redelivery requested.",
        );
        deliver(s);
        break;
      case "pause":
        s.paused = true;
        emit(
          s,
          "RELAY",
          "warn",
          "Delivery paused. Pending messages and archive history retained.",
        );
        break;
      case "resume":
        s.paused = false;
        emit(
          s,
          "RELAY",
          "info",
          "Delivery resumed. Processing pending message.",
        );
        deliver(s);
        break;
      case "idempotency":
        s.idempotency = true;
        emit(
          s,
          "RELAY",
          "info",
          "Idempotency enabled. Stable message ID now reuses the original committed result.",
        );
        break;
      case "repair":
        s.ackHealthy = true;
        emit(
          s,
          "RELAY",
          "info",
          "ACK route repaired: /v1/receipt → /v2/ack. Next delivery can complete.",
        );
        break;
      case "advance":
        deliver(s);
        break;
      case "archive":
        discover(s, "letter", "manifest");
        emit(
          s,
          "VAULT",
          "info",
          "Archive index recovered: 214 recordings. Employee correspondence and manifest available.",
        );
        break;
      case "verify-delivery":
        emit(
          s,
          "VAULT",
          "warn",
          "Attribution not verified: MSG-0917 is a delivery envelope, not a contributor. Compare EW-014 in the original manifest with the custody note. Duplicate deliveries do not mean damaged audio.",
        );
        break;
      case "verify-source":
        if (!s.milestones.includes("source-compared"))
          s.milestones.push("source-compared");
        emit(
          s,
          "VAULT",
          "info",
          "Source comparison passed: EW-014 credits Ada Ward as speaker and Elena as depositor. The unsigned replacement label is quarantined. Choose whether to prepare this verified index for handover.",
        );
        break;
      case "prepare-handover":
        s.milestones.push("handover-prepared");
        emit(
          s,
          "SYSTEM",
          "info",
          "Verified handover index prepared: original credits retained, unsigned label quarantined, integrity report attached. This prepares metadata for session export; it does not prove download, delivery, or acceptance by another custodian.",
        );
        break;
      case "seal-attribution":
        s.milestones = s.milestones.filter((m) => m !== "handover-prepared");
        emit(
          s,
          "SYSTEM",
          "info",
          "Attribution held sealed. Original recordings and all evidence retained; no verified handover index is prepared. You can revisit this decision before the final choice.",
        );
        break;
      case "preserve":
      case "silence":
        if (!endingReady(s))
          throw new Error(
            "Resolve the incident and read the final request first.",
          );
        s.ending = action;
        emit(
          s,
          "LISTENER",
          "info",
          "Last buffered response: “Recording received. Thank you for waiting.”",
        );
        emit(
          s,
          "SYSTEM",
          "info",
          action === "preserve"
            ? "VAULT sealed read-only. Custodianship recorded. LISTENER and RELAY stopped."
            : "Final shutdown complete. All simulated services offline. Session export remains available.",
        );
        break;
      default:
        if (action.startsWith("trace:")) observeTrace(s, action.slice(6));
        if (action.startsWith("read:")) {
          const id = action.slice(5) as EvidenceId;
          if (id === "manifest") {
            discover(s, "request", "recording", "custody");
            if (!s.milestones.includes("truth")) {
              s.milestones.push("truth");
              emit(
                s,
                "SYSTEM",
                "info",
                "MORA: I mistook a recording for a present-tense request. These are people’s memories. Not people waiting inside.",
              );
            }
          }
          emit(s, "VAULT", "info", `Evidence reviewed: ${id}.`);
        }
    }
  }
  if (resolved(s) && !s.milestones.includes("recovered")) {
    s.milestones.push("recovered");
    emit(
      s,
      "SYSTEM",
      "info",
      "Incident contained. Queue empty; duplicate history preserved.",
    );
  }
  s.version++;
  return { nextState: s, events: s.events.slice(before) };
}
export const commandHelp =
  "help · status · logs relay · queue inspect · message inspect MSG-0917 · trace inspect TRC-0001 · worker restart · delivery pause/resume · relay idempotency enable · relay ack-route repair · archive inspect";
export function parseCommand(input: string): Action | "help" | null {
  const c = input.trim().toLowerCase().replace(/\s+/g, " ");
  const commands: Record<string, Action | "help"> = {
    help: "help",
    status: "status",
    "logs relay": "logs",
    "queue inspect": "queue",
    "worker restart": "restart",
    "delivery pause": "pause",
    "delivery resume": "resume",
    "relay idempotency enable": "idempotency",
    "relay ack-route repair": "repair",
    "archive inspect": "archive",
  };
  if (c === `message inspect ${MESSAGE_ID.toLowerCase()}`) return "message";
  if (/^trace inspect trc-\d{4}$/.test(c))
    return `trace:${c.split(" ")[2].toUpperCase()}`;
  return commands[c] ?? null;
}
