export interface MailDto {
	subject: string;
	content: string;
	attachments?: File[];
	recipients: string[];
}