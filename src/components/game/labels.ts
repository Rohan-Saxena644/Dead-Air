import type { Action } from "@/lib/game/engine";
export const labels: Partial<Record<Action, string>> = {
  status: "Inspect status",
  logs: "Inspect logs",
  queue: "Inspect queue",
  message: "Inspect message",
  trace: "Inspect trace",
  restart: "Restart worker",
  pause: "Pause delivery",
  resume: "Resume delivery",
  idempotency: "Enable idempotency",
  repair: "Repair ACK route",
  archive: "Open archive",
  advance: "Advance simulation",
  preserve: "Preserve archive",
  silence: "Finish shutdown",
};
export const effects: Partial<Record<Action, string>> = {
  pause: "Contain retries while keeping the message and all history.",
  resume: "Process the pending message using the current configuration.",
  restart:
    "Reload the worker. If active, it immediately retries the pending delivery.",
  idempotency:
    "Recognize the message ID and reuse an existing committed delivery instead of writing another copy.",
  repair:
    "Restore the return path to /v2/ack so RELAY can remove acknowledged messages.",
  archive: "Recover the archive index, manifest, and employee correspondence.",
};
