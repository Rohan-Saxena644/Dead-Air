import {
  FileText,
  ArrowUpRight,
  Pin,
  Check,
  Inbox,
  GitBranch,
  Activity,
  Archive,
  ChevronRight,
  X,
} from "lucide-react";
import type { PublicState } from "@/lib/server/projection";
import {
  MESSAGE_ID,
  evidenceIds,
  timeLabel,
  type Action,
  type EvidenceId,
} from "@/lib/game/engine";
export type Tab = "logs" | "queue" | "traces" | "archive";
export function Investigation({
  s,
  traceId,
  tab,
  setTab,
  act,
  busy,
  selected,
  setSelected,
}: {
  s: PublicState;
  traceId: string | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  act: (a: Action) => void;
  busy: boolean;
  selected: EvidenceId | null;
  setSelected: (id: EvidenceId | null) => void;
}) {
  const trace =
    s.queue.attempts.find((a) => a.id === traceId) ?? s.queue.attempts.at(-1);
  const tabs = [
    { id: "logs", label: "Event log", icon: Activity },
    { id: "queue", label: "Queue", icon: Inbox },
    { id: "traces", label: "Traces", icon: GitBranch },
    { id: "archive", label: "Archive", icon: Archive },
  ] as const;
  const doc = s.evidence.find((e) => e.id === selected);
  function open(id: EvidenceId) {
    if (!s.ending) act(`read:${id}`);
    else setSelected(id);
  }
  function inspectTrace(id: string) {
    setTab("traces");
    act(`trace:${id}`);
  }
  return (
    <section className="investigation">
      <div className="panel-heading">
        <span>02 / INVESTIGATION WORKSPACE</span>
        <span className="live-indicator">● LIVE FEED</span>
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Investigation panels"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              if (!s.ending) act(t.id === "traces" ? "trace" : t.id);
            }}
            disabled={busy}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === "queue" && s.queue.pending && (
              <span className="count">1</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="workspace-body"
        role="tabpanel"
        aria-label={tabs.find((t) => t.id === tab)?.label}
      >
        {tab === "logs" && (
          <>
            <div className="workspace-intro">
              <div>
                <h2>Something is still listening.</h2>
                <p>Follow the signal. Every action leaves a trace.</p>
              </div>
              <span className="tag amber">
                {s.ending
                  ? "SESSION CLOSED"
                  : s.queue.pending
                    ? "DELIVERY ANOMALY"
                    : "INCIDENT CONTAINED"}
              </span>
            </div>
            <div className="recording-alert">
              <div className="row between">
                <span className="micro-label">
                  <RadioWave /> INCOMING / {MESSAGE_ID}
                </span>
                <button
                  className="text-link"
                  onClick={() => {
                    act("message");
                    setTab("queue");
                  }}
                >
                  Inspect message <ArrowUpRight size={13} />
                </button>
              </div>
              <blockquote>
                “Please don’t shut it down.
                <br />
                I’m still here.”
              </blockquote>
              <div className="signal-bars" aria-hidden="true">
                {Array.from({ length: 55 }, (_, i) => (
                  <i
                    key={i}
                    style={{ height: `${8 + ((i * 13 + i * i) % 33)}px` }}
                  />
                ))}
              </div>
              <div className="row between">
                <span className="tiny">ORIGIN 2019.10.31 / 18:42:07 UTC</span>
                <span className="tiny amber">
                  RECEIVED {timeLabel(s.time)} SIM
                </span>
              </div>
            </div>
            <div className="log-table">
              <div className="log-head">
                <span>SIM TIME</span>
                <span>SOURCE / EVENT</span>
              </div>
              {s.events
                .slice(-14)
                .reverse()
                .map((e) => (
                  <div key={e.id} className={`log-row ${e.level}`}>
                    <time>{timeLabel(e.time)}</time>
                    <div>
                      <span className="log-source">{e.service}</span>
                      <p>{e.text}</p>
                      {e.traceId && (
                        <button
                          className="trace-link"
                          onClick={() => inspectTrace(e.traceId!)}
                        >
                          {e.traceId}
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
        {tab === "queue" && (
          <>
            <div className="workspace-intro">
              <div>
                <h2>The outbox</h2>
                <p>At least once. Until someone says received.</p>
              </div>
              <span className="tag">
                {s.paused
                  ? "PAUSED"
                  : s.queue.pending
                    ? "1 PENDING"
                    : "DRAINED"}
              </span>
            </div>
            <div className="message-card">
              <div className="row between">
                <button
                  className="text-link green"
                  onClick={() => act("message")}
                >
                  {MESSAGE_ID}
                  <ArrowUpRight size={14} />
                </button>
                <span className="tag amber">
                  {s.queue.pending ? "AWAITING ACK" : "ACKNOWLEDGED"}
                </span>
              </div>
              <p>“Please don’t shut it down. I’m still here.”</p>
              <dl>
                <div>
                  <dt>Originally queued</dt>
                  <dd>2019-10-31 · 18:42:07 UTC</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>EW-014 / segment 03</dd>
                </div>
                <div>
                  <dt>Attempts this session</dt>
                  <dd>{s.queue.attempts.length}</dd>
                </div>
                <div>
                  <dt>Committed records</dt>
                  <dd>
                    {s.records.length}{" "}
                    {s.records.length > 1 && (
                      <span className="amber">
                        ({s.records.length - 1} duplicate)
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <h3 className="micro-label section-label">DELIVERY HISTORY</h3>
            {s.queue.attempts
              .slice()
              .reverse()
              .map((a) => (
                <button
                  className="attempt-row"
                  key={a.id}
                  onClick={() => inspectTrace(a.id)}
                >
                  <div>
                    <span className="green">{a.id}</span>
                    <small>
                      {timeLabel(a.time)} SIM ·{" "}
                      {a.reused
                        ? "Existing record reused"
                        : "New record committed"}
                    </small>
                  </div>
                  <span className={a.acknowledged ? "green" : "red"}>
                    {a.acknowledged ? "ACK ✓" : "ACK ×"}
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            <p className="plain-explanation">
              The queue removes a message only after its receipt comes back. A
              missing receipt can mean the message already arrived.
            </p>
          </>
        )}
        {tab === "traces" && (
          <>
            <div className="workspace-intro">
              <div>
                <h2>The broken return path</h2>
                <p>A successful write. An unanswered confirmation.</p>
              </div>
              <span className="tag">
                {traceId ?? s.queue.attempts.at(-1)?.id}
              </span>
            </div>
            <div className="trace-flow">
              {[
                {
                  name: "LISTENER",
                  detail: "Forward preserved message",
                  ok: true,
                },
                { name: "RELAY", detail: "Deliver MSG-0917", ok: true },
                {
                  name: "VAULT",
                  detail: trace?.reused
                    ? "Existing commit reused · no new record"
                    : "COMMIT successful · new record",
                  ok: true,
                },
                {
                  name: "ACK → RELAY",
                  detail: trace?.acknowledged
                    ? "/v2/ack · acknowledgement received"
                    : "/v1/receipt · timeout after commit",
                  ok: trace?.acknowledged ?? false,
                },
              ].map((n, i) => (
                <div
                  key={n.name}
                  className={`trace-step ${n.ok ? "" : "fault"}`}
                >
                  <div className="trace-number">
                    {n.ok ? <Check size={16} /> : <X size={16} />}
                  </div>
                  <div>
                    <strong>{n.name}</strong>
                    <p>{n.detail}</p>
                  </div>
                  <span className="tiny">0{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="plain-explanation">
              <strong>The archive already has the message.</strong>
              <p>
                A failed acknowledgement leaves RELAY waiting for confirmation.
                Recognizing repeated message IDs prevents new copies; restoring
                the ACK route stops the retries.
              </p>
            </div>
            <h3 className="micro-label section-label">RECOVERED EVIDENCE</h3>
            {s.evidence
              .filter((e) => ["delivery", "ack", "runbook"].includes(e.id))
              .map((e) => (
                <button
                  className="evidence-row"
                  key={e.id}
                  onClick={() => open(e.id)}
                >
                  <FileText size={17} />
                  <div>
                    <strong>{e.title}</strong>
                    <small>{e.kind}</small>
                  </div>
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </>
        )}
        {tab === "archive" && (
          <>
            <div className="workspace-intro">
              <div>
                <h2>What they left behind</h2>
                <p>Read the records. Let the machine change its mind.</p>
              </div>
              <span className="tag">
                {s.evidence.length} / {evidenceIds.length} FILES
              </span>
            </div>
            <div className="archive-summary">
              <Archive size={30} />
              <div>
                <strong>MERIDIAN / MH-214</strong>
                <p>
                  {s.discovered.includes("manifest")
                    ? "214 recordings. 87 contributors. One unfinished handover."
                    : "The archive index is waiting to be recovered."}
                </p>
              </div>
            </div>
            {s.evidence.map((e) => (
              <button
                className={`evidence-row ${selected === e.id ? "active" : ""}`}
                key={e.id}
                onClick={() => open(e.id)}
              >
                <FileText size={17} />
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {e.kind} · {e.date}
                  </small>
                </div>
                {s.pinned.includes(e.id) ? (
                  <Pin size={15} />
                ) : (
                  <ArrowUpRight size={15} />
                )}
              </button>
            ))}
            <p className="plain-explanation">
              Only recovered files appear here. Follow delivery traces and open
              the manifest to uncover the rest.
            </p>
          </>
        )}
      </div>
      {doc && (
        <div
          className="document-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          <div className="document-header">
            <span className="micro-label">
              RECOVERED / {doc.kind.toUpperCase()}
            </span>
            <button
              className="icon-button"
              autoFocus
              aria-label="Close evidence"
              onClick={() => setSelected(null)}
            >
              <X size={19} />
            </button>
          </div>
          <h2 id="doc-title">{doc.title}</h2>
          <span className="tiny amber">{doc.date}</span>
          <div className="document-body">{doc.body}</div>
          <div className="row between">
            <button
              className="subtle-button"
              onClick={() => act(`pin:${doc.id}`)}
              disabled={busy || !!s.ending}
            >
              <Pin size={14} />
              {s.pinned.includes(doc.id) ? "Unpin evidence" : "Pin to notebook"}
            </button>
            <button className="text-link" onClick={() => setSelected(null)}>
              Return to investigation <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
function RadioWave() {
  return (
    <span className="radio-wave" aria-hidden="true">
      ◉
    </span>
  );
}
