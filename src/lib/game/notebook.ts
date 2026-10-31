import {
  resolved,
  type Action,
  type EvidenceId,
  type GameState,
} from "./engine";

export interface NotebookStep {
  id: string;
  title: string;
  detail: string;
  complete: boolean;
  evidenceId?: EvidenceId;
}
export interface NotebookGuide {
  phase: "investigate" | "recover" | "handover" | "complete";
  title: string;
  description: string;
  steps: NotebookStep[];
  nextAction: Action | null;
  nextLabel: string | null;
}

// Derived from canonical progress: no separate checklist save or hidden episode text.
export function notebookGuide(s: GameState): NotebookGuide {
  const has = (id: EvidenceId) => s.discovered.includes(id);
  const read = (id: EvidenceId) => (s.actions[`read:${id}`] ?? 0) > 0;
  const diagnosed = has("ack");
  if (!read("runbook") && !resolved(s)) {
    return {
      phase: "investigate",
      title: "Follow the delivery",
      description:
        "Establish what happened before changing the machine. Recovered evidence stays available in the archive.",
      steps: [
        {
          id: "queue",
          title: "Inspect the message in the queue",
          detail: "Compare its origin with the time of its latest attempt.",
          complete: has("queue"),
          ...(has("queue") ? { evidenceId: "queue" as const } : {}),
        },
        {
          id: "trace",
          title: "Follow a delivery trace",
          detail: "Find out whether the write failed, or its confirmation did.",
          complete: diagnosed,
          ...(diagnosed ? { evidenceId: "ack" as const } : {}),
        },
        {
          id: "runbook",
          title: "Recover the operating procedure",
          detail: diagnosed
            ? "The trace recovered a runbook. Read it to build a recovery checklist."
            : "A delivery trace may point to the right procedure.",
          complete: false,
          ...(has("runbook") ? { evidenceId: "runbook" as const } : {}),
        },
      ],
      nextAction: !has("queue")
        ? "queue"
        : !diagnosed
          ? "trace"
          : "read:runbook",
      nextLabel: !has("queue")
        ? "Inspect queue"
        : !diagnosed
          ? "Follow latest trace"
          : "Read recovery runbook",
    };
  }

  const stable = resolved(s);
  const last = s.queue.attempts.at(-1);
  const steps: NotebookStep[] = [
    {
      id: "contain",
      title: "Contain the retries",
      detail: !s.queue.pending
        ? "Queue drained; containment is no longer needed."
        : s.paused
          ? "Delivery is paused. The pending message is safe."
          : "Pause delivery while changing its configuration.",
      complete: s.paused || !s.queue.pending,
    },
    {
      id: "idempotency",
      title: "Recognize repeated deliveries",
      detail: s.idempotency
        ? "Idempotency is enabled. The stable message ID reuses an existing result."
        : "Enable idempotency so a retry does not append another copy.",
      complete: s.idempotency,
      evidenceId: "runbook",
    },
    {
      id: "ack",
      title: "Restore the return path",
      detail: s.ackHealthy
        ? "The acknowledgement route now points to /v2/ack."
        : "Repair the ACK route so the worker can receive its receipt.",
      complete: s.ackHealthy,
      evidenceId: "ack",
    },
    {
      id: "verify",
      title: "Verify an acknowledged delivery",
      detail: stable
        ? last?.reused
          ? "Receipt received. The existing commit was reused; the queue is empty."
          : "Receipt received and queue empty. Idempotency now protects future retries."
        : "Resume delivery after both repairs, then check that the queue drains.",
      complete: stable,
    },
  ];
  if (!stable) {
    const needsContainment =
      s.queue.pending && !s.paused && (!s.idempotency || !s.ackHealthy);
    return {
      phase: "recover",
      title: "Make one safe delivery",
      description:
        "Adapted from the recovered runbook. Completed steps follow the actual machine, even if you repaired it in a different order.",
      steps,
      nextAction: needsContainment
        ? "pause"
        : !s.idempotency
          ? "idempotency"
          : !s.ackHealthy
            ? "repair"
            : s.paused
              ? "resume"
              : "advance",
      nextLabel: needsContainment
        ? "Pause delivery"
        : !s.idempotency
          ? "Enable idempotency"
          : !s.ackHealthy
            ? "Repair ACK route"
            : s.paused
              ? "Resume and verify"
              : "Verify next delivery",
    };
  }
  const truth = s.milestones.includes("truth");
  const requestRead = read("request");
  return {
    phase: s.ending ? "complete" : "handover",
    title: s.ending ? "Handover recorded" : "Find out what you recovered",
    description:
      "The incident is stable. Existing duplicate records remain in the audit history. The archive still has a story to tell.",
    steps: [
      ...steps,
      {
        id: "manifest",
        title: "Read the archive manifest",
        detail: truth
          ? "The recording’s origin has been established."
          : "Recover the archive index and read its manifest.",
        complete: truth,
        ...(has("manifest") ? { evidenceId: "manifest" as const } : {}),
      },
      {
        id: "request",
        title: "Read the final request",
        detail: requestRead
          ? "The terms of the handover are understood."
          : truth
            ? "The manifest recovered a final request. Read it before choosing."
            : "Follow the archive evidence to its unfinished request.",
        complete: requestRead,
        ...(has("request") ? { evidenceId: "request" as const } : {}),
      },
    ],
    nextAction:
      s.ending || requestRead
        ? null
        : !has("manifest")
          ? "archive"
          : !truth
            ? "read:manifest"
            : "read:request",
    nextLabel:
      s.ending || requestRead
        ? null
        : !has("manifest")
          ? "Recover archive index"
          : !truth
            ? "Read archive manifest"
            : "Read final request",
  };
}

export interface ActionReport {
  tone: "success" | "warning" | "neutral";
  title: string;
  detail: string;
  attemptsAdded: number;
  recordsAdded: number;
  pending: boolean;
  ackHealthy: boolean;
  traceId?: string;
  evidenceIds: EvidenceId[];
}
export function actionReport(
  before: GameState,
  after: GameState,
  action: Action,
): ActionReport | null {
  if (
    ![
      "pause",
      "resume",
      "restart",
      "idempotency",
      "repair",
      "verify-source",
      "verify-delivery",
      "prepare-handover",
      "seal-attribution",
    ].includes(action)
  )
    return null;
  const attemptsAdded =
    after.queue.attempts.length - before.queue.attempts.length;
  const recordsAdded = after.records.length - before.records.length;
  const stats = {
    attemptsAdded,
    recordsAdded,
    pending: after.queue.pending,
    ackHealthy: after.ackHealthy,
    traceId: after.queue.attempts.at(-1)?.id,
    evidenceIds: after.discovered.filter(
      (id) =>
        !before.discovered.includes(id) || id === "runbook" || id === "custody",
    ),
  };
  if (
    [
      "verify-source",
      "verify-delivery",
      "prepare-handover",
      "seal-attribution",
    ].includes(action)
  )
    return {
      ...stats,
      tone: action === "verify-delivery" ? "warning" : "success",
      title:
        action === "verify-delivery"
          ? "That theory does not match the source"
          : "Custody decision recorded",
      detail: after.events.at(-1)!.text,
    };
  if (action === "pause")
    return {
      ...stats,
      tone: "neutral",
      title: "Delivery paused",
      detail: after.queue.pending
        ? "The message remains pending. Automatic retries are contained while you work."
        : "The queue is already empty. Archive history remains intact.",
    };
  if (action === "idempotency")
    return {
      ...stats,
      tone: "success",
      title: "Repeated deliveries will be recognized",
      detail:
        "Future retries reuse the existing committed result. Earlier duplicate records remain in history.",
    };
  if (action === "repair")
    return {
      ...stats,
      tone: "success",
      title: "Return path restored",
      detail: after.queue.pending
        ? "The ACK route is repaired. A new delivery attempt must still receive its confirmation."
        : "The queue is already empty. The restored route is ready for future acknowledgements.",
    };
  if (attemptsAdded === 0)
    return {
      ...stats,
      tone: "neutral",
      title:
        action === "restart"
          ? "Worker restarted without delivery"
          : "Delivery resumed",
      detail: after.paused
        ? "Delivery stayed paused. No attempt was made and no record was added."
        : "No message was pending. No attempt was made and no record was added.",
    };
  const last = after.queue.attempts.at(-1)!;
  return {
    ...stats,
    tone:
      recordsAdded > 0 ? "warning" : last.acknowledged ? "success" : "neutral",
    title:
      recordsAdded > 0
        ? "Another archive record was written"
        : last.acknowledged
          ? "Delivery acknowledged"
          : "Existing archive record reused",
    detail: `${last.reused ? "Idempotency reused the original committed result." : "This attempt appended another copy of the same message."} ${last.acknowledged ? "Its receipt arrived and the queue drained." : "Its acknowledgement failed; the message is still pending."}`,
  };
}
