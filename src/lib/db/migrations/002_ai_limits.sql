CREATE TABLE ai_leases (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE ai_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  window_start INTEGER NOT NULL,
  turns INTEGER NOT NULL
);
INSERT INTO ai_budget VALUES (1, 0, 0);
