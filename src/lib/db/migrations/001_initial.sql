CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  version INTEGER NOT NULL,
  conversation TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  last_ai_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS actions (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  action_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state_version INTEGER NOT NULL,
  events TEXT NOT NULL,
  PRIMARY KEY (session_id, action_id)
);
CREATE TABLE IF NOT EXISTS invocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  metadata TEXT NOT NULL
);
