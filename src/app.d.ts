// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Services } from '$lib/server/di/container';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			services: Services;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				"r2-mail-service": R2Bucket;
				d1_mail_service: D1Database;
			};
		}
	}
}

export {};
