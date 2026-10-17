CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_score ON users(score DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
