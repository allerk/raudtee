import { json, type RequestHandler } from '@sveltejs/kit';
import type { MessageDto } from '$lib/server/domain/dto/message.dto';
import { AppError } from '$lib/server/errors/app-error';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const { mailService } = locals.services;
		const result: MessageDto[] = await mailService.getMails();
		return json({ ok: true, result: result }, { status: 200 })
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
}
