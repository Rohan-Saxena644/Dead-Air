import {
  Radio,
  Repeat2,
  Database,
  CirclePause,
  Play,
  RotateCcw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { PublicState } from "@/lib/server/projection";
import type { Action } from "@/lib/game/engine";
import { effects } from "./labels";
export function ServiceMap({
  s,
  act,
  busy,
}: {
  s: PublicState;
  act: (a: Action) => void;
  busy: boolean;
}) {
  const icons = [Radio, Repeat2, Database];
  return (
    <aside className="systems-panel">
      <div className="panel-heading">
        <span>01 / SYSTEM TOPOLOGY</span>
        <span className="tiny">3 NODES</span>
      </div>
      <div className="topology">
        <div className="topology-line" />
        {s.services.map((service, i) => {
          const Icon = icons[i];
          return (
            <button
              key={service.name}
              className={`service ${service.status}`}
              onClick={() =>
                act(i === 0 ? "message" : i === 1 ? "queue" : "archive")
              }
              disabled={busy || !!s.ending}
            >
              <div className="service-icon">
                <Icon size={22} />
              </div>
              <div>
                <span className="service-name">{service.name}</span>
                <small>
                  {i === 0
                    ? "Event ingestion"
                    : i === 1
                      ? "Delivery worker"
                      : "Archive storage"}
                </small>
              </div>
              <span className="service-dot" />
              <span className="service-state">
                {service.status.toUpperCase()}
              </span>
            </button>
          );
        })}
        <div className={`ack-path ${s.ackHealthy ? "healthy" : ""}`}>
          <span>↳ ACK RETURN PATH</span>
          <strong>{s.ackHealthy ? "RESTORED" : "INTERRUPTED"}</strong>
        </div>
      </div>
      <div className="panel-heading control-heading">
        <span>OPERATIONAL CONTROLS</span>
      </div>
      <div className="controls">
        <button
          disabled={busy || !!s.ending}
          onClick={() => act(s.paused ? "resume" : "pause")}
          title={effects[s.paused ? "resume" : "pause"]}
        >
          {s.paused ? <Play size={15} /> : <CirclePause size={15} />}{" "}
          {s.paused ? "Resume delivery" : "Pause delivery"}
          <span className="key-label">{s.paused ? "OFF" : "ON"}</span>
        </button>
        <button
          disabled={busy || !!s.ending}
          onClick={() => act("restart")}
          title={effects.restart}
        >
          <RotateCcw size={15} /> Restart worker{" "}
          <span className="amber">↗</span>
        </button>
        <div className="control-divider" />
        <button
          disabled={busy || s.idempotency || !!s.ending}
          onClick={() => act("idempotency")}
          title={effects.idempotency}
        >
          <ShieldCheck size={15} /> Idempotency{" "}
          <span className={s.idempotency ? "green" : "amber"}>
            {s.idempotency ? "ENABLED" : "OFF"}
          </span>
        </button>
        <button
          disabled={busy || s.ackHealthy || !!s.ending}
          onClick={() => act("repair")}
          title={effects.repair}
        >
          <Wrench size={15} /> ACK route{" "}
          <span className={s.ackHealthy ? "green" : "red"}>
            {s.ackHealthy ? "HEALTHY" : "FAULT"}
          </span>
        </button>
      </div>
      <div className="system-note">
        <span className="micro-label">OPERATOR NOTE</span>
        <p>
          {s.records.length > 1
            ? "Every duplicate is a record of a delivery, not a new message. History survives recovery."
            : "A connection is not a heartbeat. Find out what this machine is waiting for."}
        </p>
        <span className="tiny">FICTIONAL SYSTEMS / ISOLATED SIMULATION</span>
      </div>
    </aside>
  );
}
