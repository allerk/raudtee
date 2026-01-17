import type { AttachmentDto } from '$lib/server/domain/dto/attachment.dto';
import type { R2ObjectBody } from '@cloudflare/workers-types';

export interface AttachmentDownloadDto extends AttachmentDto {
	file: R2ObjectBody;
}