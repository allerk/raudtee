import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { MailService } from '$lib/server/services/mail.service';
import { AttachmentRepository } from '$lib/server/repositories/attachment.repository';
import { RecipientRepository } from '$lib/server/repositories/recipient.repository';
import { MessageRepository } from '$lib/server/repositories/message.repository';

export interface Services {
	mailService: MailService,
}
export const createServices = (db: D1Database, r2: R2Bucket): Services => {
	// Repositories
	const recipientRepository: RecipientRepository = new RecipientRepository(db);
	const attachmentRepository: AttachmentRepository = new AttachmentRepository(db, r2);
	const messageRepository: MessageRepository = new MessageRepository(
		db,
		attachmentRepository,
		recipientRepository
	);

	// Services
	const mailService: MailService = new MailService(
		db,
		messageRepository,
		attachmentRepository,
		recipientRepository
	);

	return { mailService: mailService };
};