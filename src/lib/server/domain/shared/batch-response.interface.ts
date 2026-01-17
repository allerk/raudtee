import type { D1PreparedStatement } from '@cloudflare/workers-types';

export interface BatchResponse {
	id: string;
	statement: D1PreparedStatement;
	r2Key?: string;
}