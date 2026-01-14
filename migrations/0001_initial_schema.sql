-- Migration number: 0001 	 2026-01-14T17:14:24.062Z
CREATE TABLE messages (
	id TEXT PRIMARY KEY,
	recipient TEXT NOT NULL,
	sender TEXT NOT NULL,
	subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sentAt TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE attachments (
	id TEXT PRIMARY KEY,
	messageId TEXT NOT NULL REFERENCES messages(id),
    r2Key TEXT NOT NULL,
	filename TEXT NOT NULL,
    contentType TEXT NOT NULL,
    size INTEGER NOT NULL,
    createdAt TEXT NOT NULL
);