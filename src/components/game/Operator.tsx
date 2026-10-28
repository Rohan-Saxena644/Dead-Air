import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Sparkles, BookOpen } from "lucide-react";
import type { PublicState, Conversation } from "@/lib/server/projection";
import type { Action, EvidenceId } from "@/lib/game/engine";
import { labels, effects } from "./labels";
import { IncidentNotebook } from "./IncidentNotebook";
export function Operator({
  s,
  conversation,
  mode,
  chatBusy,
  ask,
  act,
  openEvidence,
  notebook,
  setNotebook,
  busy,
  notebookAction,
  notebookRevision,
}: {
  s: PublicState;
  conversation: Conversation[];
  mode: string;
  chatBusy: boolean;
  ask: (q: string) => void;
  act: (a: Action) => void;
  openEvidence: (id: EvidenceId) => void;
  notebook: boolean;
  setNotebook: (open: boolean) => void;
  busy: boolean;
  notebookAction: (action: Action) => void;
  notebookRevision: number;
}) {
  const [question, setQuestion] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [conversation, chatBusy]);
  return (
    <aside className="operator-panel">
      <div className="panel-heading">
        <span>03 / OPERATOR CHANNEL</span>
        <span className="green">●</span>
      </div>
      <div className="operator-identity">
        <div className="mora-symbol" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div>
          <h2>
            MORA<span>v.09</span>
          </h2>
          <p>Maintenance & archival operator</p>
        </div>
        <span className="tag">ONLINE</span>
      </div>
      <div className="operator-tabs">
        <button
          onClick={() => setNotebook(false)}
          className={!notebook ? "active" : ""}
        >
          Channel
        </button>
        <button
          onClick={() => setNotebook(true)}
          className={notebook ? "active" : ""}
        >
          <BookOpen size={13} /> Evidence <span>{s.discovered.length}</span>
        </button>
      </div>
      {notebook ? (
        <IncidentNotebook
          key={notebookRevision}
          s={s}
          busy={busy}
          act={notebookAction}
          openEvidence={openEvidence}
        />
      ) : (
        <>
          <div className="conversation" aria-live="polite">
            {s.milestones.includes("truth") && (
              <div className="chat-entry knowledge-update">
                <span className="micro-label amber">
                  INTERPRETATION REVISED / MANIFEST RECOVERED
                </span>
                <p>
                  I mistook a recording for a present-tense request. These are
                  people’s memories. Not people waiting inside.
                </p>
              </div>
            )}
            <div className="chat-entry assistant">
              <span className="chat-name">
                MORA <span>02:13</span>
              </span>
              <p>
                You are not on the staff list.
                <br />
                <br />
                That is all right. There has not been a staff list for some
                time.
              </p>
              <p className="muted">
                A delivery is repeating. I have been waiting for someone to
                acknowledge it.
              </p>
            </div>
            {conversation.map((c, i) => (
              <div key={i} className={`chat-entry ${c.role}`}>
                <span className="chat-name">
                  {c.role === "user" ? "YOU" : "MORA"}
                  {c.mode && <span>{c.mode}</span>}
                </span>
                <p>{c.message}</p>
                {c.evidenceIds?.map((id) => (
                  <button
                    key={id}
                    className="citation"
                    onClick={() => openEvidence(id as EvidenceId)}
                  >
                    {s.evidence.find((e) => e.id === id)?.title ?? id}
                    <ArrowUpRight size={11} />
                  </button>
                ))}
                {c.suggestedActionId &&
                  s.legalActions.includes(c.suggestedActionId as Action) && (
                    <button
                      title={effects[c.suggestedActionId as Action]}
                      className="suggestion"
                      onClick={() => act(c.suggestedActionId as Action)}
                    >
                      <Sparkles size={13} />
                      {labels[c.suggestedActionId as Action] ??
                        "Review evidence"}
                      <ArrowUpRight size={13} />
                    </button>
                  )}
              </div>
            ))}
            {chatBusy && (
              <div className="chat-entry">
                <span className="micro-label green">
                  MORA IS CONSULTING THE RECORDS…
                </span>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="operator-composer">
            <button
              className="explain-button"
              disabled={chatBusy}
              onClick={() =>
                ask("Explain what I know and suggest the next investigation.")
              }
            >
              <Sparkles size={12} /> Explain this / ask for a hint
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (question.trim()) {
                  ask(question);
                  setQuestion("");
                }
              }}
            >
              <input
                aria-label="Ask MORA"
                placeholder="Ask MORA about the evidence…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={1200}
                disabled={chatBusy}
              />
              <button
                aria-label="Send to MORA"
                disabled={chatBusy || !question.trim()}
              >
                <ArrowUp size={17} />
              </button>
            </form>
            <div className="tiny row between">
              <span>{mode}</span>
              <span>ADVISORY ONLY</span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
