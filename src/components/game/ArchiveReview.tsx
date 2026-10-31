import type { PublicState } from "@/lib/server/projection";
import type { Action } from "@/lib/game/engine";

export function ArchiveReview({
  s,
  act,
  busy,
}: {
  s: PublicState;
  act: (a: Action) => void;
  busy: boolean;
}) {
  if (!s.endingReady || s.ending) return null;
  const read = (s.actions["read:custody"] ?? 0) > 0;
  return (
    <section
      className="archive-review"
      aria-label="Optional archive verification"
    >
      <div>
        <span className="micro-label amber">OPTIONAL / BEFORE YOU CHOOSE</span>
        <h2>Whose name goes on the box?</h2>
        <p>
          A replacement label disagrees with the original catalog. Verify
          attribution for a prepared handover, or leave the uncertain change
          sealed. Both final choices remain available.
        </p>
        <p role="status">
          {s.handoverPrepared
            ? "Verified index prepared. No download or outside receipt is confirmed."
            : "No verified handover index prepared. Original recordings remain intact."}
        </p>
      </div>
      <div className="archive-review-actions">
        <button
          className="subtle-button"
          disabled={busy}
          onClick={() => act("read:custody")}
        >
          Read custody comparison
        </button>
        {read && (
          <>
            <button
              className="subtle-button"
              disabled={busy}
              onClick={() => act("verify-source")}
            >
              Credit the original speaker and depositor
            </button>
            <button
              className="subtle-button"
              disabled={busy}
              onClick={() => act("verify-delivery")}
            >
              Use the delivery account as the speaker
            </button>
            {s.legalActions.includes("prepare-handover") && (
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => act("prepare-handover")}
              >
                Prepare verified handover index
              </button>
            )}
            <button
              className="subtle-button"
              disabled={busy}
              onClick={() => act("seal-attribution")}
            >
              Keep uncertain attribution sealed
            </button>
          </>
        )}
      </div>
    </section>
  );
}
