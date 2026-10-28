import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ActionReport } from "@/lib/game/notebook";
export function ActionFeedback({
  report,
  dismiss,
}: {
  report: ActionReport;
  dismiss: () => void;
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
