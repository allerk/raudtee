import { json, type RequestHandler } from '@sveltejs/kit';
import { sendEmailSchema } from '$lib/server/schemas/sendEmail.schema';
import { z } from 'zod';
import { AppError } from '$lib/server/errors/app-error';

export const POST: RequestHandler = async ({ request, locals }) => {
	const formData = await request.formData();
	const data = {
		subject: formData.get('subject'),
		content: formData.get('content'),
		recipients: formData.getAll('recipients'),
		attachments: formData.getAll('attachments')
	};
	const result = sendEmailSchema.safeParse(data);
	if (!result.success) {
		const formattedErrors = z.treeifyError(result.error);

		return json({
			error: 'Validation failed',
			details: formattedErrors
		}, { status: 400 });
	}

	try {
		const { subject, content, recipients, attachments } = result.data;
		const { mailService } = locals.services;

		await mailService.sendEmail({ subject, content, recipients, attachments });
		return json({ ok: true }, { status: 202 })
	} catch (err) {
		if (err instanceof AppError) {
			return json({
				ok: false,
				error: err.message,
				code: err.code,
			}, { status: err.status })
		}
		console.error('Unhandled error:', err);
		return json({
			ok: false,
			error: 'An unexpected error occurred',
			code: 'UNKNOWN_ERROR'
		}, { status: 500 });
	}
};
