export interface AttachmentDto {
	id?: string;
	messageId?: string;
	filename: string;
	contentType: string;
	size: number;
	downloadUrl?: string;
}