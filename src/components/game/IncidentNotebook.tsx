import { ArrowRight, ArrowUpRight, Check, Circle, Pin } from "lucide-react";
import type { PublicState } from "@/lib/server/projection";
import type { Action, EvidenceId } from "@/lib/game/engine";
import { notebookGuide } from "@/lib/game/notebook";
import { effects } from "./labels";

export function IncidentNotebook({
  s,
  busy,
  act,
  openEvidence,
}: {
  s: PublicState;
  busy: boolean;
  act: (a: Action) => void;
  openEvidence: (id: EvidenceId) => void;
}) {
  const guide = notebookGuide(s);
  const completed = guide.steps.filter((step) => step.complete).length;
  return (
    <div className="notebook" aria-label="Incident notebook">
      <div className="notebook-plan">
        <div className="row between">
          <span className="micro-label green">INVESTIGATION PLAN</span>
          <span className="tiny">
            {completed} / {guide.steps.length}
          </span>
        </div>
        <h3>{guide.title}</h3>
        <p>{guide.description}</p>
        {guide.nextAction && s.legalActions.includes(guide.nextAction) && (
          <button
            className="notebook-next"
            disabled={busy}
            title={effects[guide.nextAction]}
            onClick={() => act(guide.nextAction!)}
          >
            {guide.nextLabel}
            <ArrowRight size={14} />
          </button>
        )}
        <ol className="notebook-checklist" aria-label="Investigation checklist">
          {guide.steps.map((step) => (
            <li key={step.id} className={step.complete ? "complete" : ""}>
              <span
                className="step-icon"
                aria-label={step.complete ? "Complete" : "Pending"}
              >
                {step.complete ? <Check size={13} /> : <Circle size={11} />}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
                {step.evidenceId && (
                  <button
                    className="text-link"
                    onClick={() => openEvidence(step.evidenceId!)}
                  >
                    Review source
                    <ArrowUpRight size={11} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!guide.nextAction && !s.ending && (
          <p className="handover-ready">
            Handover ready. Use the final choice below the workspace when you
            are ready.
          </p>
        )}
      </div>
      <span className="micro-label green">CONFIRMED OBSERVATIONS</span>
      <p>Meridian Systems ceased operations in 2019.</p>
      {s.discovered.includes("queue") && (
        <p>
          The pending message originated in 2019. Current attempt timestamps
          describe retries.
        </p>
      )}
      {s.discovered.includes("ack") && (
        <p>VAULT commits before the acknowledgement fails.</p>
      )}
      {s.milestones.includes("truth") && (
        <p>The voice is a 2017 recording. MORA is an automated operator.</p>
      )}
      <span className="micro-label amber">WORKING INTERPRETATION</span>
      <p>
        {s.milestones.includes("truth")
          ? "An unfinished preservation request kept the machine waiting."
          : s.discovered.includes("queue")
            ? "A current delivery attempt is replaying something much older."
            : "The alert is recent. Its source still needs to be established."}
      </p>
      <span className="micro-label">PINNED EVIDENCE</span>
      {s.pinned.length === 0 ? (
        <p className="muted">Open a document and pin it here.</p>
      ) : (
        s.pinned.map((id) => (
          <button
            className="evidence-row"
            key={id}
            onClick={() => openEvidence(id)}
          >
            <Pin size={14} />
            {s.evidence.find((e) => e.id === id)?.title}
            <ArrowUpRight size={13} />
          </button>
        ))
      )}
      <span className="micro-label green">CURRENT OBJECTIVE</span>
      <p>{s.objective}</p>
    </div>
  );
}
