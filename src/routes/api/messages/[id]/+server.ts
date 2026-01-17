import type { MessageDto } from '$lib/server/domain/dto/message.dto';
import { json, type RequestHandler } from '@sveltejs/kit';
import { AppError } from '$lib/server/errors/app-error';

export const GET: RequestHandler = async ({ locals, params }) => {
	try {
		const { mailService } = locals.services;
		const { id } = params;
		const result: MessageDto | null = await mailService.getOneMail(id!);
		if (!result) {
			return json({ ok: false, error: 'Message not found!', code: 'NOT_FOUND'}, { status: 404 })
		}
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