"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Radio,
  HelpCircle,
  X,
  Download,
  RotateCcw,
  Check,
  Shield,
  Power,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { PublicState, Conversation } from "@/lib/server/projection";
import {
  timeLabel,
  type Action,
  type EvidenceId,
  type Ending,
} from "@/lib/game/engine";
import { Comfort } from "./Atmosphere";
import { ServiceMap } from "./ServiceMap";
import { Investigation, type Tab } from "./Investigation";
import { Operator } from "./Operator";
import { Terminal } from "./Terminal";
import { labels } from "./labels";
import { actionReport, type ActionReport } from "@/lib/game/notebook";
import { ActionFeedback } from "./ActionFeedback";
import { SaveNotice } from "./SaveNotice";
import { ArchiveReview } from "./ArchiveReview";
import { OutcomeBadges } from "./OutcomeBadges";
export function Game() {
  const [state, setState] = useState<PublicState | null>(null);
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [mode, setMode] = useState("Scripted fallback");
  const [entered, setEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("logs");
  const [traceId, setTraceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EvidenceId | null>(null);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState("");
  const [confirmation, setConfirmation] = useState<Ending | null>(null);
  const [mobile, setMobile] = useState("investigate");
  const [notebook, setNotebook] = useState(false);
  const [notebookRevision, setNotebookRevision] = useState(0);
  const [report, setReport] = useState<ActionReport | null>(null);
  const sessionEpoch = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setSaveNotice(d.saveNotice ?? null);
        if (d.state) {
          setState(d.state);
          setConversation(d.conversation);
          setMode(d.mode);
        }
      })
      .catch(() =>
        setError("Could not reach the local console. Reload to reconnect."),
      )
      .finally(() => setLoading(false));
  }, []);
  async function continueInvestigation() {
    setBusy(true);
    try {
      const response = await fetch("/api/session");
      if (!response.ok) throw new Error("Could not reconnect. Try again.");
      const saved = await response.json();
      if (!saved.state) setExpired(true);
      else {
        setState(saved.state);
        stateRef.current = saved.state;
        setConversation(saved.conversation);
        setMode(saved.mode);
      }
      setEntered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reconnect.");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    sessionEpoch.current++;
    setChatBusy(false);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/session", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSaveNotice(d.saveNotice ?? null);
      setState(d.state);
      stateRef.current = d.state;
      setConversation([]);
      setMode(d.mode);
      setEntered(true);
      setExpired(false);
      setTab("logs");
      setTraceId(null);
      setSelected(null);
      setConfirmation(null);
      setMobile("investigate");
      setNotebook(false);
      setReport(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session.");
    } finally {
      setBusy(false);
    }
  }
  const act = useCallback(
    async (action: Action, suggestionVersion?: number): Promise<string> => {
      const current = stateRef.current;
      if (!current || actionLock.current)
        return "An action is already in progress.";
      actionLock.current = true;
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            actionId: crypto.randomUUID(),
            version: current.version,
            suggestionVersion,
          }),
        });
        const d = await r.json();
        if (r.status === 401) setExpired(true);
        if (d.state) {
          stateRef.current = d.state;
          setState(d.state);
        }
        if (!r.ok) throw new Error(d.error);
        const result = actionReport(current, d.state, action);
        if (result) setReport(result);
        if (action.startsWith("read:"))
          setSelected(action.slice(5) as EvidenceId);
        if (action === "archive") setTab("archive");
        if (action === "trace" || action.startsWith("trace:")) {
          setTab("traces");
          setTraceId(
            action === "trace"
              ? d.state.queue.attempts.at(-1)?.id
              : action.slice(6),
          );
        }
        if (action === "queue" || action === "message") setTab("queue");
        return `${labels[action] ?? "Action"} complete. ${d.state.events.at(-1)?.text ?? ""}`;
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Connection lost. Reload the saved investigation to check the result.";
        setError(message);
        return message;
      } finally {
        actionLock.current = false;
        setBusy(false);
      }
    },
    [],
  );
  const active = entered && state !== null && !state.ending;
  useEffect(() => {
    if (!selected && !help && !confirmation) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ),
      );
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        setHelp(false);
        setConfirmation(null);
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [selected, help, confirmation]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !actionLock.current &&
        !selected &&
        !expired
      )
        void act("advance");
    }, 25000);
    return () => clearInterval(timer);
  }, [active, act, selected, expired]);
  async function ask(question: string) {
    if (chatBusy) return;
    const epoch = sessionEpoch.current;
    setChatBusy(true);
    setError("");
    setRetryQuestion("");
    try {
      const r = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await r.json();
      if (epoch !== sessionEpoch.current) return;
      if (r.status === 401) setExpired(true);
      if (!r.ok) throw new Error(d.error);
      setConversation((c) => [
        ...c,
        { role: "user", message: question },
        d.assistant,
      ]);
      setMode(d.mode);
      if (d.retry) {
        setRetryQuestion(question);
        setError(
          "Live operator unavailable. MORA replied in clearly labeled scripted fallback mode; your investigation is saved.",
        );
      }
    } catch (e) {
      if (epoch !== sessionEpoch.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "Operator unavailable. Your investigation is unaffected.",
      );
      setRetryQuestion(question);
    } finally {
      if (epoch === sessionEpoch.current) setChatBusy(false);
    }
  }
  function openEvidence(id: EvidenceId) {
    setMobile("investigate");
    if (!state?.ending) void act(`read:${id}`);
    else setSelected(id);
  }
  function notebookAction(action: Action) {
    if (
      ["queue", "trace", "archive"].includes(action) ||
      action.startsWith("read:")
    )
      setMobile("investigate");
    void act(action);
  }
  function openNotebook() {
    setNotebook(true);
    setMobile("operator");
    setNotebookRevision((value) => value + 1);
  }
  if (!entered)
    return (
      <main className="opening">
        <div className="opening-grid" aria-hidden="true" />
        <header className="opening-header">
          <span className="brand">
            <span className="meridian-logo">M</span>MERIDIAN
            <span className="brand-sub">SYSTEMS</span>
          </span>
          <div className="row">
            <span className="tiny">ARCHIVED OPERATIONS / EST. 2008</span>
            <Comfort />
          </div>
        </header>
        <SaveNotice message={saveNotice} />
        <div className="opening-main">
          <div className="episode-label">
            <span /> AN INTERACTIVE SYSTEMS HORROR{" "}
            <span className="episode-no">EPISODE 01</span>
          </div>
          <h1>
            DEAD
            <span>
              AIR<span className="title-period">.</span>
            </span>
          </h1>
          <div className="opening-bottom">
            <div>
              <span className="micro-label amber">
                THE LAST ACKNOWLEDGEMENT
              </span>
              <p className="premise">
                <strong>02:13 AM.</strong>
                <br />
                MERIDIAN SYSTEMS ceased operations seven years ago.
                <br />
                <span>One connection is still active.</span>
              </p>
              <p className="opening-description">
                You are the incoming archive operator. A message from 2019 won’t
                stop.
                <br />
                Inspect its queue, follow the missing receipt, then decide what
                remains.
              </p>
              <div className="opening-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    state ? void continueInvestigation() : void start()
                  }
                  disabled={busy || loading}
                >
                  {loading
                    ? "Connecting…"
                    : state
                      ? "Continue investigation"
                      : "Start investigation"}
                  <ArrowRight size={18} />
                </button>
                {state && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => void start()}
                  >
                    New investigation <RotateCcw size={13} />
                  </button>
                )}
              </div>
              <div className="opening-meta">
                <span>10–15 MINUTES</span>
                <i />
                <span>NO BACKEND EXPERIENCE NEEDED</span>
                <i />
                <span>2 ENDINGS / 4 VARIATIONS</span>
              </div>
              <p className="tiny muted">
                Live MORA sends your questions and discovered game context to
                Google. Scripted hints work without inference.
              </p>
            </div>
            <div className="signal-visual" aria-hidden="true">
              <div className="radar-rings">
                <i />
                <i />
                <i />
                <div className="radar-cross" />
                <div className="radar-dot" />
              </div>
              <div className="signal-coordinate">
                51° 30′ 26″ N<br />
                SIGNAL ORIGIN / UNRESOLVED
              </div>
              <div className="signal-caption">
                <span className="red">●</span> 001 CONNECTION REMAINS
              </div>
            </div>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="opening-footer">
          <span>
            <Shield size={13} /> A fictional simulation. All commands stay
            inside the game.
          </span>
          <span>
            SOUND OPTIONAL <span className="green">/</span> HEADPHONES
            RECOMMENDED
          </span>
          <span>GHOST IN THE MACHINE / 2026</span>
        </footer>
      </main>
    );
  if (!state) return null;
  if (expired)
    return (
      <main className="ending-screen">
        <div className="ending-content">
          <h1>This console’s save has reset.</h1>
          <p>
            The temporary server save is no longer available. Start a fresh
            investigation to reconnect; browser outcome badges remain when local
            storage is available.
          </p>
          <button
            className="primary-button"
            onClick={() => void start()}
            disabled={busy}
          >
            New investigation <RotateCcw size={16} />
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </main>
    );
  if (state.ending && state.finalScene)
    return (
      <main className="ending-screen">
        <header className="ending-header">
          <span className="wordmark">
            DEAD AIR<span>.</span>
          </span>
          <Comfort />
        </header>
        <SaveNotice message={saveNotice} />
        <div className="ending-content">
          <div className="episode-label">
            <span className="green">●</span> {state.finalScene.subtitle}
          </div>
          <h1>{state.finalScene.title}</h1>
          <div className="ending-scene">{state.finalScene.scene}</div>
          <div className="ending-mora">
            <span className="micro-label green">MORA / FINAL RESPONSE</span>
            <p>{state.finalScene.mora}</p>
          </div>
          <div className="ending-report">
            <div>
              <span className="micro-label">WHAT YOU UNCOVERED</span>
              <p>
                A recording of Ada Ward in 2017, queued by Elena during the 2019
                closure. An automated operator mistook an unfinished
                preservation obligation for a request that could never end.
              </p>
              <span className="micro-label">THE INCIDENT</span>
              <p>
                At-least-once delivery wrote to VAULT before its acknowledgement
                failed. Retries appended duplicates. Idempotency reused the
                original result; a repaired ACK route allowed the queue to
                drain. {state.records.length - 1} duplicate record(s) remain in
                history.
              </p>
            </div>
            <div className="session-timeline">
              <span className="micro-label">
                SESSION TIMELINE / SIMULATED UTC
              </span>
              {state.events
                .filter(
                  (e) =>
                    e.service === "SYSTEM" ||
                    e.text.includes("paused") ||
                    e.text.includes("enabled") ||
                    e.text.includes("repaired"),
                )
                .map((e) => (
                  <div key={e.id}>
                    <time>{timeLabel(e.time)}</time>
                    <p>{e.text}</p>
                  </div>
                ))}
            </div>
          </div>
          <p className="outcome-consequence">{state.finalScene.consequence}</p>
          <p>
            You made {state.queue.attempts.length} delivery attempts and
            retained {state.records.length} record(s).{" "}
            {state.handoverPrepared
              ? "You compared source attribution and prepared the verified index."
              : "You completed the incident without preparing a verified custody index."}{" "}
            Your final choice was {state.ending}.
          </p>
          <OutcomeBadges completed={state.outcome!} />
          <div className="ending-actions">
            <a className="primary-button" href="/api/export" download>
              <Download size={16} />
              Export investigation
            </a>
            <button
              className="subtle-button"
              onClick={() => void start()}
              disabled={busy}
            >
              <RotateCcw size={15} />
              Replay episode
            </button>
          </div>
          <p className="tiny muted">
            Only the fictional machine changed. Nothing on your computer was
            deleted.
          </p>
        </div>
      </main>
    );
  return (
    <main className={`console mobile-${mobile}`}>
      <header className="console-header">
        <div className="row">
          <button
            className="wordmark"
            onClick={() => setEntered(false)}
            aria-label="Return to opening"
          >
            DEAD AIR<span>.</span>
          </button>
          <span className="header-divider" />
          <div className="company">
            <strong>MERIDIAN SYSTEMS</strong>
            <span>OPERATIONS CONSOLE / DECOMMISSIONED 2019</span>
          </div>
        </div>
        <div className="header-right">
          <span
            className={`incident-status ${state.queue.pending ? "" : "contained"}`}
          >
            <i />
            {state.queue.pending ? "INCIDENT ACTIVE" : "INCIDENT CONTAINED"}
          </span>
          <div className="sim-clock">
            <strong>{timeLabel(state.time)}</strong>
            <span>2026.10.27 / SIM UTC</span>
          </div>
          <button
            className="icon-button"
            aria-label="Help and investigation guide"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={18} />
          </button>
          <Comfort eventCount={state.events.length} />
        </div>
      </header>
      <div className="incident-strip">
        <div>
          <span className="micro-label">INCIDENT 0917</span>
          <ChevronRight size={13} />
          <span>The Last Acknowledgement</span>
        </div>
        <span>
          <span className="connection-dot" /> CONNECTION STABLE{" "}
          <span className="muted">/</span> {mode}
        </span>
      </div>
      <SaveNotice message={saveNotice} />
      <div className="mission-bar">
        <div className="mission-number">!</div>
        <div>
          <span className="micro-label">CURRENT OBJECTIVE</span>
          <p>{state.objective}</p>
        </div>
        <button className="notebook-shortcut" onClick={openNotebook}>
          <BookOpen size={14} />
          Open incident notebook
        </button>
        <span className="tiny">AUTO-SAVED · V{state.version}</span>
      </div>
      {report && (
        <ActionFeedback
          report={report}
          dismiss={() => setReport(null)}
          act={(a) => void act(a)}
        />
      )}
      <nav className="mobile-navigation" aria-label="Console views">
        {[
          ["systems", "Systems"],
          ["investigate", "Investigate"],
          ["operator", "MORA / evidence"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={mobile === id ? "active" : ""}
            onClick={() => setMobile(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="console-grid">
        <ServiceMap s={state} act={(a) => void act(a)} busy={busy} />
        <Investigation
          s={state}
          traceId={traceId}
          tab={tab}
          setTab={setTab}
          act={(a) => void act(a)}
          busy={busy}
          selected={selected}
          setSelected={setSelected}
        />
        <Operator
          s={state}
          conversation={conversation}
          mode={mode}
          chatBusy={chatBusy}
          ask={(q) => void ask(q)}
          act={(a, version) => void act(a, version)}
          openEvidence={openEvidence}
          notebook={notebook}
          setNotebook={setNotebook}
          busy={busy}
          notebookAction={notebookAction}
          notebookRevision={notebookRevision}
        />
      </div>
      <ArchiveReview s={state} act={(a) => void act(a)} busy={busy} />
      {state.endingReady && (
        <div className="resolution-bar">
          <div>
            <Check size={18} />
            <span>
              Handover conditions met. <strong>The choice is yours.</strong>
            </span>
          </div>
          <button onClick={() => setConfirmation("preserve")}>
            <Shield size={14} />
            Preserve archive
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setConfirmation("silence")}>
            <Power size={14} />
            Finish shutdown
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      <Terminal act={act} busy={busy} />
      <footer className="console-footer">
        <span>
          <Radio size={12} /> ALL SERVICES ARE FICTIONAL
        </span>
        <span>
          {state.queue.attempts.length} ATTEMPTS <i>/</i> {state.records.length}{" "}
          RECORDS <i>/</i> {state.discovered.length} EVIDENCE
        </span>
        <a href="/api/export" download>
          EXPORT SESSION <Download size={11} />
        </a>
      </footer>
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          {retryQuestion && (
            <button onClick={() => void ask(retryQuestion)} disabled={chatBusy}>
              Retry MORA
            </button>
          )}
          <button
            aria-label="Dismiss notification"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {help && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <div className="row between">
              <span className="micro-label green">
                FIRST SHIFT / QUICK GUIDE
              </span>
              <button
                className="icon-button"
                autoFocus
                aria-label="Close help"
                onClick={() => setHelp(false)}
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="help-title">Find out why it won’t let go.</h2>
            <p>
              You are investigating a fictional archive machine. There is no
              countdown and no way to lose required evidence.
            </p>
            <ol>
              <li>
                <strong>Observe.</strong> Open the queue and inspect a trace.
                Compare when the message was recorded with when it was
                delivered.
              </li>
              <li>
                <strong>Investigate.</strong> Read recovered documents in Traces
                and Archive. Pin important clues to MORA’s evidence notebook.
              </li>
              <li>
                <strong>Recover.</strong> Use operational controls or the
                simulated terminal. Hover a control to learn what it does. The
                old runbook explains a safe repair.
              </li>
              <li>
                <strong>Choose.</strong> Read the manifest and final request.
                Once delivery is stable, decide the archive’s future.
              </li>
            </ol>
            <p>
              Ask MORA to explain unfamiliar terms. Its current mode is always
              displayed. Scripted fallback uses authored, state-aware hints.
            </p>
            <button className="primary-button" onClick={() => setHelp(false)}>
              Return to console
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="choice-title"
          >
            <div className="row between">
              <span className="micro-label amber">
                FINAL HANDOVER / EXPLICIT CONFIRMATION
              </span>
              <button
                className="icon-button"
                autoFocus
                aria-label="Cancel final choice"
                onClick={() => setConfirmation(null)}
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="choice-title">
              {confirmation === "preserve"
                ? "Keep a place for the recordings."
                : "Let the machine rest."}
            </h2>
            <p>
              {confirmation === "preserve"
                ? "VAULT will be sealed read-only. The recordings remain under your fictional custodianship. LISTENER and RELAY will stop, and MORA’s preservation task will be complete."
                : "All three simulated services will stop. The fictional archive will close, and MORA’s task will be complete. You can still export this investigation afterward."}
            </p>
            <p>
              Both choices honor Elena’s request. This ends the episode; replay
              begins a new session.
            </p>
            <p>
              {state.handoverPrepared
                ? "Your verified index is prepared for export. That does not establish download or receipt by another custodian."
                : "No verified handover index is prepared. Preservation will keep uncertain attribution sealed; shutdown will close without that handover. You can keep investigating first."}
            </p>
            <a className="subtle-button" href="/api/export" download>
              <Download size={15} />
              Export archive & investigation first
            </a>
            <div className="modal-actions">
              <button
                className="subtle-button"
                onClick={() => setConfirmation(null)}
              >
                Keep investigating
              </button>
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => void act(confirmation)}
              >
                {confirmation === "preserve"
                  ? "Confirm preservation"
                  : "Confirm shutdown"}
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
