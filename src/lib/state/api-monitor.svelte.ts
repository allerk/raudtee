export interface ApiLog {
	method: string;
	url: string;
	status: number;
	ok: boolean;
	time: string;
	error?: string;
	code?: string;
}

export const apiLogs = $state<ApiLog[]>([]);

export function addApiLog(method: string, url: string, ok: boolean, status: number, error?: string, code?: string) {
	const newLog: ApiLog = {
		method,
		url,
		status: status,
		ok: ok,
		error,
		code,
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		time: new Date().toLocaleTimeString(),
	};

	apiLogs.unshift(newLog);
	if (apiLogs.length > 5) apiLogs.pop();
}