import "server-only";
import type { Ending, EvidenceId } from "../game/engine";
export interface Evidence {
  id: EvidenceId;
  title: string;
  kind: string;
  date: string;
  body: string;
}
export const evidence: Record<EvidenceId, Evidence> = {
  shutdown: {
    id: "shutdown",
    title: "The lights go out",
    kind: "Company notice",
    date: "2019-10-31 · 17:00 UTC",
    body: "MERIDIAN SYSTEMS / FINAL OPERATIONS NOTICE\n\nEffective today, Meridian Systems has ceased trading. Public intake closes at 18:00 UTC. The voice archive will remain available only until the decommission procedure is complete.\n\nPlease do not treat an illuminated console as evidence of continued staffing. No engineer will be on call after tonight.\n\nOutstanding archive handover: Elena Ward.\nDecommission owner: Julian Bell.\n\nThank you for trusting us with things you could not bear to lose.",
  },
  delivery: {
    id: "delivery",
    title: "A delivery that succeeded",
    kind: "Delivery trace",
    date: "2026-10-27 · live simulation",
    body: "MESSAGE MSG-0917 / stable identity preserved since ingest\n\n01  LISTENER forwards preserved recording segment.\n02  RELAY sends message to VAULT.\n03  VAULT commits delivery record successfully.\n04  RELAY requests acknowledgement from retired /v1/receipt.\n05  Acknowledgement times out. Message remains pending.\n\nThe write succeeded. The confirmation did not. An error after a write does not undo the write. Compare this trace with the queue and delivery history.",
  },
  queue: {
    id: "queue",
    title: "Seven years in the outbox",
    kind: "Queue record",
    date: "Origin: 2019-10-31 · 18:42:07 UTC",
    body: "ID: MSG-0917\nSource: archive EW-014 / segment 03\nDelivery guarantee: at least once\nRemoval condition: positive acknowledgement\nPayload: “Please don’t shut it down. I’m still here.”\n\nOrigin timestamp is immutable. Attempt timestamps describe replays, not new speech.\n\nAt least once means a message can arrive more than once. Until an acknowledgement comes back, RELAY cannot tell a lost delivery from a lost confirmation.",
  },
  ack: {
    id: "ack",
    title: "The missing return path",
    kind: "Route diagnostic",
    date: "2026-10-27 · live simulation",
    body: "VAULT accepts writes through /v2/delivery.\nRELAY still expects acknowledgements at /v1/receipt.\n\nDuring the 2019 shutdown, the compatibility endpoint was removed before the pending queue drained. The delivery path survived; the acknowledgement path did not.\n\nRepair target: /v2/ack.\nA worker restart reloads the same broken route and immediately retries a pending message. A restart is not a route repair.",
  },
  runbook: {
    id: "runbook",
    title: "When a receipt never arrives",
    kind: "Operations runbook",
    date: "2019-10-28 · Julian Bell",
    body: "SAFE RECOVERY / DELIVERY AFTER COMMIT\n\n1. Pause delivery to contain retries. Nothing is deleted.\n2. Enable idempotency using the stable message ID. If a delivery already exists, return that committed result instead of writing another copy.\n3. Repair the acknowledgement route to /v2/ack.\n4. Resume delivery. Confirm that the queue drains without adding another archive record.\n\nDo not erase duplicates: they are evidence of what happened. Idempotency prevents future duplicates; it cannot change the past.\n\nIf the route was repaired first and the queue has already drained, enabling idempotency still secures the handover.",
  },
  letter: {
    id: "letter",
    title: "Leave the machine on",
    kind: "Employee correspondence",
    date: "2019-10-31 · 18:35 UTC",
    body: "FROM Elena Ward / archive services\nTO Julian Bell / operations\nSUBJECT Re: final power-down\n\nThere are 214 recordings left in the transfer. Not accounts. Recordings. A kettle in someone’s old kitchen. A father teaching his daughter the names of the birds. People saying nothing in particular because they thought there would be more time.\n\nMy mother’s is EW-014. I know I should have exported it sooner. Please leave the archive machine on until the transfer gets its final receipt.\n\nI’m going home. MORA has the preservation request. If you’re already gone too, I hope it knows what “until” means.\n\n— Elena",
  },
  manifest: {
    id: "manifest",
    title: "An inventory of ordinary things",
    kind: "Archive manifest",
    date: "2019-10-31 · 18:40 UTC",
    body: "MERIDIAN / HANDOVER BATCH MH-214\n214 recordings · 87 contributors · integrity verified\n\nEW-014  Ada Ward / kitchen, rain / 2017-11-12\nJB-006  Julian Bell / birds with Iris / 2018-04-08\nNS-021  N. Shah / birthday, three attempts / 2016-06-02\n… 211 further entries retained in the fictional archive.\n\nMSG-0917 references EW-014 segment 03. Its words were recorded in 2017 and queued for preservation in 2019. No live input device is attached.\n\nMORA is an automated maintenance operator. It has no occupancy sensor and no evidence of a person inside this machine. Its unfinished task is preservation, not rescue.\n\nAttached: Elena’s final request and EW-014 transcript.",
  },
  request: {
    id: "request",
    title: "Until someone can take over",
    kind: "Final preservation request",
    date: "2019-10-31 · 18:42 UTC",
    body: "TO MORA / unresolved obligation PR-0917\n\nKeep the archive intact until someone can take over. Please don’t interpret the recordings as instructions. My mother asked me not to switch off the tape before she finished her story. That is all you are hearing.\n\nWhen the transfer is safe, the next operator may keep a read-only copy or close the archive. I cannot decide for whoever has to carry this next. Neither choice brings anyone back.\n\nI only ask that someone listen before they choose.\n\nElena Ward\n\nHandover condition: stable delivery, acknowledged queue, archive integrity retained.",
  },
  recording: {
    id: "recording",
    title: "Kitchen, rain / segment 03",
    kind: "Personal recording transcript",
    date: "Recorded 2017-11-12 · Ada & Elena Ward",
    body: "[A kettle clicks off. Rain against a small window.]\n\nADA: Is the red light still on?\nELENA: Yes, Mum.\nADA: Please don’t shut it down. I’m still here.\nELENA: I know. I’m just turning the tape over.\nADA: Oh. Well, where was I?\n\n[A chair moves. Someone laughs.]\n\nADA: Your father never did learn the names of those birds. He made them up. Every single one.\n\n[End of preserved segment. No further live signal.]",
  },
};
export const endings: Record<
  Ending,
  { title: string; subtitle: string; scene: string; mora: string }
> = {
  preserve: {
    title: "A place for what remains.",
    subtitle: "ENDING 01 / PRESERVE",
    scene:
      "You seal VAULT in a stable, read-only state. LISTENER closes its intake. RELAY has nothing left to deliver. For the first time in seven years, the archive is quiet without being empty.\n\nThe handover names you as its custodian. It is a small responsibility, and a real one. Somewhere in the inventory, a kettle will always be about to click off.",
    mora: "The request is complete. I was keeping a connection open because I did not understand the difference between keeping something and waiting for it. You may disconnect now. The recordings will remain.",
  },
  silence: {
    title: "Nothing left waiting.",
    subtitle: "ENDING 02 / SILENCE",
    scene:
      "You complete the shutdown Elena could not finish. The final receipt is filed. One by one, the service lights go dark. A buffered confirmation arrives from LISTENER after its light has already gone out: “Recording received. Thank you for waiting.”\n\nThe memories were heard. They were never asking you to keep the room lit forever. Outside this console, morning is beginning.",
    mora: "The request is complete. There is no one trapped here. There never was. Thank you for staying long enough to find out. I have no outstanding obligations.",
  },
};
