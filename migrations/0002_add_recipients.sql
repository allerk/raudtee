-- Migration number: 0002 	 2026-01-15T21:39:06.935Z
CREATE TABLE recipients (
    id TEXT PRIMARY KEY,
    messageId TEXT NOT NULL REFERENCES messages(id),
    email TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
)

CREATE INDEX IF NOT EXISTS idx_recipients_messageId ON recipients(messageId);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);