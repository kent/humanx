-- Short-lived relay for X OAuth results across browser contexts: the OAuth
-- callback (often in Safari) stashes the verified-X session here under a
-- one-time link code; the mini app webview claims it by polling, so the session
-- lands in the webview's own cookie jar.

CREATE TABLE IF NOT EXISTS pending_x_connections (
  link_code TEXT PRIMARY KEY,
  session_value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS pending_x_connections_expires_idx
  ON pending_x_connections (expires_at);
