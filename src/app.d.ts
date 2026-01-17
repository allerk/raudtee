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
				BUCKET: R2Bucket;
				DB: D1Database;
			};
		}
	}
}

export {};
