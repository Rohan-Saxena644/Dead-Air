import "server-only";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  initialState,
  transition,
  type Action,
  type GameState,
} from "../game/engine";
import type { Conversation } from "../server/projection";
let db: Database.Database | undefined;
export function database() {
  if (db) return db;
  const path =
    process.env.DATABASE_PATH || join(process.cwd(), "data", "dead-air.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)",
  );
  if (!db.prepare("SELECT version FROM migrations WHERE version=1").get()) {
    db.transaction(() => {
      db!.exec(
        readFileSync(
          join(process.cwd(), "src/lib/db/migrations/001_initial.sql"),
          "utf8",
        ),
      );
      db!.prepare("INSERT INTO migrations VALUES (1)").run();
    })();
  }
  if (!db.prepare("SELECT version FROM migrations WHERE version=2").get()) {
    db.transaction(() => {
      db!.exec(
        readFileSync(
          join(process.cwd(), "src/lib/db/migrations/002_ai_limits.sql"),
          "utf8",
        ),
      );
      db!.prepare("INSERT INTO migrations VALUES (2)").run();
    })();
  }
  return db;
}
interface Row {
  id: string;
  state: string;
  version: number;
  conversation: string;
  ai_requests: number;
  last_ai_at: number;
}
export function createSession(id: string) {
  const s = initialState();
  database()
    .prepare(
      "INSERT INTO sessions (id,state,version,created_at) VALUES (?,?,?,?)",
    )
    .run(id, JSON.stringify(s), s.version, Date.now());
  return s;
}
export function getSession(id: string) {
  const row = database()
    .prepare("SELECT * FROM sessions WHERE id=?")
    .get(id) as Row | undefined;
  return row
    ? {
        state: JSON.parse(row.state) as GameState,
        conversation: JSON.parse(row.conversation) as Conversation[],
        aiRequests: row.ai_requests,
        lastAiAt: row.last_ai_at,
      }
    : null;
}
export class Conflict extends Error {}
export function submitAction(
  id: string,
  actionId: string,
  expectedVersion: number,
  action: Action,
) {
  return database().transaction(() => {
    const saved = getSession(id);
    if (!saved) throw new Error("Session not found.");
    if (
      database()
        .prepare("SELECT 1 FROM actions WHERE session_id=? AND action_id=?")
        .get(id, actionId)
    )
      return saved;
    if (saved.state.version !== expectedVersion)
      throw new Conflict(
        "Another action arrived first. State refreshed; retry your action.",
      );
    const { nextState, events } = transition(saved.state, action);
    database()
      .prepare("UPDATE sessions SET state=?,version=? WHERE id=? AND version=?")
      .run(JSON.stringify(nextState), nextState.version, id, expectedVersion);
    database()
      .prepare("INSERT INTO actions VALUES (?,?,?,?,?)")
      .run(id, actionId, action, nextState.version, JSON.stringify(events));
    return { ...saved, state: nextState };
  })();
}
export function reserveAi(id: string) {
  return database().transaction(() => {
    const s = getSession(id);
    if (!s) throw new Error("Session not found.");
    const now = Date.now();
    database().prepare("DELETE FROM ai_leases WHERE expires_at<=?").run(now);
    if (
      database().prepare("SELECT 1 FROM ai_leases WHERE session_id=?").get(id)
    )
      return false;
    if (s.aiRequests >= 100 || now - s.lastAiAt < 1200) return false;
    const active = database()
      .prepare("SELECT count(*) AS n FROM ai_leases")
      .get() as { n: number };
    if (active.n >= 2) return false;
    const budget = database()
      .prepare("SELECT * FROM ai_budget WHERE id=1")
      .get() as { window_start: number; turns: number };
    if (now - budget.window_start >= 3_600_000)
      database()
        .prepare("UPDATE ai_budget SET window_start=?,turns=0 WHERE id=1")
        .run(now);
    else if (budget.turns >= 120) return false;
    database().prepare("UPDATE ai_budget SET turns=turns+1 WHERE id=1").run();
    // The entire model turn is bounded to 30s. Expiry recovers leases after a crash.
    database()
      .prepare("INSERT INTO ai_leases VALUES (?,?)")
      .run(id, now + 45_000);
    database()
      .prepare(
        "UPDATE sessions SET ai_requests=ai_requests+1,last_ai_at=? WHERE id=?",
      )
      .run(Date.now(), id);
    return true;
  })();
}
export function releaseAi(id: string) {
  database().prepare("DELETE FROM ai_leases WHERE session_id=?").run(id);
}
export function saveConversation(
  id: string,
  user: Conversation,
  assistant: Conversation,
  metadata: unknown,
) {
  database().transaction(() => {
    const saved = getSession(id);
    if (!saved) return;
    database()
      .prepare("UPDATE sessions SET conversation=? WHERE id=?")
      .run(
        JSON.stringify([...saved.conversation, user, assistant].slice(-80)),
        id,
      );
    database()
      .prepare("INSERT INTO invocations(session_id,metadata) VALUES (?,?)")
      .run(id, JSON.stringify(metadata));
  })();
}
export function invocations(id: string) {
  return database()
    .prepare(
      "SELECT metadata FROM invocations WHERE session_id=? ORDER BY id DESC LIMIT 12",
    )
    .all(id)
    .map((r) => JSON.parse((r as { metadata: string }).metadata));
}
