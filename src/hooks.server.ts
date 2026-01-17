import { createServices } from '$lib/server/di/container';
import type { Handle } from '@sveltejs/kit';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.platform?.env) {
		event.locals.services = createServices(
			event.platform.env.DB as unknown as D1Database,
			event.platform.env.BUCKET as unknown as R2Bucket
		);
	}

	return resolve(event);
};