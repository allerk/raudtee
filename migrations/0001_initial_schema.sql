-- Migration number: 0001 	 2026-01-14T17:14:24.062Z
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
	id TEXT PRIMARY KEY,
	subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sentAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

DROP TABLE IF EXISTS attachments;
CREATE TABLE attachments (
	id TEXT PRIMARY KEY,
	messageId TEXT NOT NULL REFERENCES messages(id),
    r2Key TEXT NOT NULL,
	filename TEXT NOT NULL,
    contentType TEXT NOT NULL,
    size INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_messageId ON attachments(messageId);
CREATE INDEX IF NOT EXISTS idx_attachments_r2Key ON attachments(r2Key);