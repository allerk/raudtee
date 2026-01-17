import type { D1Database, ReadableStream as CFStream } from '@cloudflare/workers-types';
import type { RecipientRepository } from '$lib/server/repositories/recipient.repository';
import type { MessageRepository } from '$lib/server/repositories/message.repository';
import type { AttachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';
import type { MessageDto } from '$lib/server/domain/dto/message.dto';
import type { MailDto } from '$lib/server/domain/dto/mail.dto';
import { AppError } from '$lib/server/errors/app-error';

export class MailService {
	constructor(
		private readonly db: D1Database,
		private readonly messageRepository: MessageRepository,
		private readonly attachmentRepository: AttachmentRepository,
		private readonly recipientRepository: RecipientRepository
	) {}

	async sendEmail(payload: MailDto) {
		const uniqueRecipients: string[] = [...new Set(payload.recipients as string[])];

		if (uniqueRecipients.length > 3) {
			throw new AppError('Maximum 3 recipients allowed', 400, 'LIMIT_RECIPIENTS');
		}

		if (payload.attachments) {
			for (const file of payload.attachments) {
				if (file.size > 4 * 1024 * 1024) {
					throw new AppError('Maximum file size must be 4mb', 413, 'FILE_TOO_LARGE');
				}
			}
		}

		const uploadedR2Keys: string[] = [];
		const statements: D1PreparedStatement[] = [];

		try {
			const msg: BatchResponse = await this.messageRepository.createBatch({
				subject: payload.subject,
				content: payload.content,
			});
			statements.push(msg.statement);

			if (payload.attachments) {
				for (const file of payload.attachments) {
					const stream = file.stream();
					const cfStream = stream as unknown as CFStream;
					const attach: BatchResponse = await this.attachmentRepository.createBatch(
						{
							messageId: msg.id,
							filename: file.name,
							contentType: file.type,
							size: file.size,
						},
						cfStream
					);
					statements.push(attach.statement);
					uploadedR2Keys.push(attach.r2Key!);
				}
			}

			for (const email of uniqueRecipients) {
				const recipient: BatchResponse = await this.recipientRepository.createBatch({
					messageId: msg.id,
					email: email,
				});
				statements.push(recipient.statement);
			}

			await this.db.batch(statements);

		} catch (error) {
			// cleanup
			for (const key of uploadedR2Keys) {
				await this.attachmentRepository.delete(key);
			}
			if (error instanceof AppError) {
				throw error;
			}
			throw new AppError('Failed to process email transaction', 500, 'INTERNAL_DB_ERROR');
		}
	}

	async getMails(): Promise<Omit<MessageDto, 'attachments' | 'recipients'>[]> {
		return await this.messageRepository.findAll();
	}

	async getOneMail(id: string): Promise<MessageDto | null> {
		return await this.messageRepository.findOne(id);
	}
}