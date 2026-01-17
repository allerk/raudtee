import type { D1Database } from '@cloudflare/workers-types';
import type { RecipientDto } from '$lib/server/domain/dto/recipient.dto';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';
import type { Recipient } from '$lib/server/domain/entities/recipient.entity';

export class RecipientRepository {
	constructor(private readonly db: D1Database) {}

	async createBatch(dto: RecipientDto): Promise<BatchResponse> {
		const id: string = crypto.randomUUID();

		const statement = this.db
			.prepare(`INSERT INTO recipients (id, messageId, email) VALUES (?, ?, ?)`)
			.bind(id, dto.messageId, dto.email);

		return { id, statement } as BatchResponse;
	}

	async findAllByMessageId(messageId: string): Promise<RecipientDto[]> {
		const { results } = await this.db
			.prepare(`SELECT * FROM recipients WHERE messageId = ?`)
			.bind(messageId)
			.all<Recipient>();

		return (results || []).map((row) => ({
			id: row.id,
			email: row.email
		}))
	}
}