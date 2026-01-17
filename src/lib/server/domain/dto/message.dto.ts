import type { AttachmentDto } from '$lib/server/domain/dto/attachment.dto';
import type { RecipientDto } from '$lib/server/domain/dto/recipient.dto';

export interface MessageDto {
	id?: string;
	subject: string;
	content: string;
	sentAt?: string;
	attachments?: AttachmentDto[];
	recipients?: RecipientDto[];
}