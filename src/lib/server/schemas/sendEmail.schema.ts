import { z } from 'zod';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export const sendEmailSchema = z.object({
	subject: z.string().min(1, 'Subject must not be empty').max(200),
	content: z.string().min(1, 'Content must not be empty'),
	recipients: z.array(
		z.email('Invalid email address')
	)
		.min(1, 'At least one recipient must be provided')
		.max(3, 'Maximum of 3 recipients allowed'),
	attachments: z.array(
		z.instanceof(File)
			.refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 4MB')
		// might be useful to validate the file type later
	).optional()
});