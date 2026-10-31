"use client";
import { useEffect, useState } from "react";
import { outcomeIds, type OutcomeId } from "@/lib/game/engine";
const names = [
  "Preserve / organized",
  "Preserve / sealed",
  "Silence / handover",
  "Silence / unprepared",
];
export function OutcomeBadges({ completed }: { completed: OutcomeId }) {
  const [seen, setSeen] = useState<OutcomeId[]>([]);
  useEffect(() => {
    let prior: OutcomeId[] = [];
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("dead-air-outcomes") ?? "[]",
      );
      if (Array.isArray(value))
        prior = outcomeIds.filter((id) => value.includes(id));
    } catch {
      /* Storage may be unavailable or contain invalid data. */
    }
    const next = [...new Set([...prior, completed])];
    // A local souvenir only. Never sent to the server or used to unlock anything.
    try {
      localStorage.setItem("dead-air-outcomes", JSON.stringify(next));
    } catch {
      /* Current outcome still displays. */
    }
    const frame = requestAnimationFrame(() => setSeen(next));
    return () => cancelAnimationFrame(frame);
  }, [completed]);
  return (
    <section className="outcome-badges" aria-label="Completed outcomes">
      <span className="micro-label">
        TWO MAIN ENDINGS / FOUR OUTCOME VARIATIONS
      </span>
      <p>
        The central mystery stays the same. A different custody decision or
        final choice changes what you leave behind.
      </p>
      <div>
        {outcomeIds.map((id, i) => (
          <span className={seen.includes(id) ? "tag green" : "tag"} key={id}>
            {seen.includes(id) ? "✓ " : "○ "}
            {names[i]}
          </span>
        ))}
      </div>
      <p className="tiny muted">
        Completion badges stay in this browser when storage is available. They
        unlock no evidence.
      </p>
    </section>
  );
}
