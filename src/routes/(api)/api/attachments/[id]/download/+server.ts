import { json, type RequestHandler } from '@sveltejs/kit';
import { AppError } from '$lib/server/errors/app-error';
import type { AttachmentDownloadDto } from '$lib/server/domain/dto/attachment_download.dto';

export const GET: RequestHandler = async ({ locals, params }) => {
	try {
		const { mailService } = locals.services;
		const { id } = params;
		const result: AttachmentDownloadDto | null = await mailService.downloadAttachment(id!);
		if (!result) {
			return json({ ok: false, error: 'Attachment File not found!', code: 'NOT_FOUND'}, { status: 404 })
		}
		const headers = new Headers();

		headers.set('Content-Type', result.contentType);

		const filename = encodeURIComponent(result.filename);
		headers.set('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

		headers.set('Content-Length', result.size.toString());

		const stream = result.file.body as unknown as ReadableStream;

		return new Response(stream, {
			status: 200,
			headers
		});
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