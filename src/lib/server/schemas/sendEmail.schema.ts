import { z } from 'zod';
export const sendEmailSchema = z.object({
	subject: z.string().min(1, 'Subject must not be empty').max(200),
	content: z.string().min(1, 'Content must not be empty'),
	recipients: z.array(
		z.email('Invalid email address')
	)
		.min(1, 'At least one recipient must be provided')
		.max(3, 'Maximum of 3 recipients allowed'),
});