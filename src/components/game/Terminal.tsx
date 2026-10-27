import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal as TerminalIcon } from "lucide-react";
import { commandHelp, parseCommand, type Action } from "@/lib/game/engine";
export function Terminal({
  act,
  busy,
}: {
  act: (a: Action) => Promise<string>;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [output, setOutput] = useState(
    "Isolated simulation. Type help for supported commands.",
  );
  async function submit() {
    const text = input.trim();
    if (!text) return;
    setHistory((h) => [...h, text]);
    setPosition(history.length + 1);
    setInput("");
    const action = parseCommand(text);
    if (action === "help") setOutput(commandHelp);
    else if (!action)
      setOutput(
        `Unknown simulated command: ${text}. Type help for the complete command list. No system shell is connected.`,
      );
    else setOutput(await act(action));
  }
  return (
    <section className="terminal">
      <button
        className="terminal-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <TerminalIcon size={14} />
        <span>MERIDIAN SHELL</span>
        <span className="tiny">SIMULATION ONLY</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {expanded && (
        <div className="terminal-content">
          <div className="terminal-output" role="status">
            {output}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label htmlFor="terminal-input">
              operator@meridian <span>~ $</span>
            </label>
            <input
              id="terminal-input"
              autoComplete="off"
              spellCheck={false}
              value={input}
              disabled={busy}
              placeholder="help"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const p = Math.max(0, position - 1);
                  setPosition(p);
                  setInput(history[p] ?? "");
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const p = Math.min(history.length, position + 1);
                  setPosition(p);
                  setInput(history[p] ?? "");
                }
              }}
            />
          </form>
        </div>
      )}
    </section>
  );
}
