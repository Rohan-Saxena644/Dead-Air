import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ActionReport } from "@/lib/game/notebook";
import type { Action } from "@/lib/game/engine";
export function ActionFeedback({
  report,
  dismiss,
  act,
}: {
  report: ActionReport;
  dismiss: () => void;
  act: (a: Action) => void;
}) {
  const Icon =
    report.tone === "warning"
      ? TriangleAlert
      : report.tone === "success"
        ? CheckCircle2
        : Info;
  return (
    <section
      className={`action-feedback ${report.tone}`}
      role="status"
      aria-label="Action result"
    >
      <Icon size={17} />
      <div>
        <strong>{report.title}</strong>
        <p>{report.detail}</p>
        <div className="action-result-metrics">
          <span>ATTEMPTS +{report.attemptsAdded}</span>
          <span>RECORDS +{report.recordsAdded}</span>
          <span>QUEUE {report.pending ? "PENDING" : "EMPTY"}</span>
          <span>ACK ROUTE {report.ackHealthy ? "HEALTHY" : "BROKEN"}</span>
        </div>
        <div className="feedback-links">
          {report.traceId && (
            <button
              className="text-link"
              onClick={() => act(`trace:${report.traceId}`)}
            >
              Inspect relevant trace
            </button>
          )}
          {report.evidenceIds.map((id) => (
            <button
              key={id}
              className="text-link"
              onClick={() => act(`read:${id}`)}
            >
              Read {id}
            </button>
          ))}
        </div>
      </div>
      <button
        className="icon-button"
        aria-label="Dismiss action result"
        onClick={dismiss}
      >
        <X size={15} />
      </button>
    </section>
  );
}
