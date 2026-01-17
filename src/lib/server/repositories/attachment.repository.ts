import type { D1Database, R2Bucket, ReadableStream as CFStream } from '@cloudflare/workers-types';
import type { AttachmentDto } from '$lib/server/domain/dto/attachment.dto';
import type { Attachment } from '$lib/server/domain/entities/attachment.entity';
import type { AttachmentDownloadDto } from '$lib/server/domain/dto/attachment_download.dto';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';

export class AttachmentRepository {
	constructor(private readonly db: D1Database, private readonly r2: R2Bucket) {}

	async createBatch(metadata: AttachmentDto, stream: CFStream): Promise<BatchResponse> {
		const attachmentId = crypto.randomUUID();
		const r2Key = `attachments/messages/${metadata.messageId}/${attachmentId}_${metadata.filename}`;
		const uploadedAt = Date.now();

		await this.r2.put(r2Key, stream, {
			httpMetadata: { contentType: metadata.contentType },
			customMetadata: {
				attachmentId: attachmentId,
				messageId: metadata.messageId!,
				originalFilename: metadata.filename,
				uploadedAt: uploadedAt.toString()
			}
		});

		const statement = this.db
			.prepare(
				`INSERT INTO attachments (id, messageId, filename, contentType, size, r2Key, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				attachmentId,
				metadata.messageId,
				metadata.filename,
				metadata.contentType,
				metadata.size,
				r2Key,
				uploadedAt
			);

		return {
			id: attachmentId,
			statement: statement,
			r2Key: r2Key
		};
	}

	async findAllByMessageId(messageId: string): Promise<AttachmentDto[]> {
		const { results } = await this.db
			.prepare('SELECT * FROM attachments WHERE messageId = ?')
			.bind(messageId)
			.all<Attachment>();

		return (results || []).map((row) => ({
			id: row.id,
			filename: row.filename,
			contentType: row.contentType,
			size: row.size,
			downloadUrl: `/api/attachments/${row.id}/download`
		}));
	}

	async delete(r2Key: string): Promise<void> {
		await this.r2.delete(r2Key);
	}

	async getFile(attachmentId: string): Promise<AttachmentDownloadDto | null> {
		const metadata = await this.db
			.prepare('SELECT * FROM attachments WHERE id = ?')
			.bind(attachmentId)
			.first<Attachment>();

		if (!metadata) return null;

		const file = await this.r2.get(metadata.r2Key);

		if (!file) return null;

		return {
			filename: metadata.filename,
			contentType: metadata.contentType,
			size: metadata.size,
			file: file,
		};
	}
}