import type { D1Database } from '@cloudflare/workers-types';
import type { AttachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { RecipientRepository } from '$lib/server/repositories/recipient.repository';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';
import type { MessageDto } from '$lib/server/domain/dto/message.dto';
import type { Message } from '$lib/server/domain/entities/message.entity';

export class MessageRepository {
	constructor(
		private readonly db: D1Database,
		private readonly attachmentRepository: AttachmentRepository,
		private readonly recipientRepository: RecipientRepository
	) {}

	async createBatch(dto: MessageDto): Promise<BatchResponse> {
		const id = crypto.randomUUID();
		const sentAt = new Date(Date.now()).toDateString();

		const statement = this.db
			.prepare(
				'INSERT INTO messages (id, subject, content, sentAt) VALUES (?, ?, ?, ?)'
			)
			.bind(id, dto.subject, dto.content, sentAt);

		return {
			id,
			statement,
		};
	}

	async findOne(id: string): Promise<MessageDto | null> {
		const record = await this.db
			.prepare('SELECT * FROM messages WHERE id = ?')
			.bind(id)
			.first<Message>();

		if (!record) {
			return null;
		}

		const [attachments, recipients] = await Promise.all([
			this.attachmentRepository.findAllByMessageId(id),
			this.recipientRepository.findAllByMessageId(id),
		]);

		return {
			id: record.id,
			subject: record.subject,
			content: record.content,
			sentAt: record.sentAt,
			attachments: attachments,
			recipients: recipients,
		};
	}

	async findAll(): Promise<Omit<MessageDto, 'attachments' | 'recipients'>[]> {
		const { results } = await this.db
			.prepare('SELECT * FROM messages')
			.all<Message>();

		return (results || []).map((row) => ({
			id: row.id,
			subject: row.subject,
			content: row.content,
			sentAt: row.sentAt,
		}));
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.db
			.prepare('DELETE FROM messages WHERE id = ?')
			.bind(id)
			.run();

		return result.success;
	}
}
