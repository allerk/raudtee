<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { addApiLog } from '$lib/state/api-monitor.svelte';
	import { resolve } from '$app/paths';
	import type { MessageDto } from '$lib/server/domain/dto/message.dto';

	let message: MessageDto = null;
	let loading = true;
	let error: unknown = null;

	const id = () => page.params.id;

	async function loadDetails() {
		try {
			const result = await fetch(`/api/v1.0/messages/${id()}`);

			const data = await result.json();

			if (data.ok) {
				message = data.result;
				addApiLog('GET', `/api/v1.0/messages/${id()}`, data.ok, result.status);
			} else {
				error = data.error || 'Failed to load message';
			}
		} catch (e) {
			error = { global: e.message};
		} finally {
			loading = false;
		}
	}

	async function handleDownload(file: { id: string; filename: string }) {
		const url = `/api/v1.0/attachments/${file.id}/download`;

		try {
			const res = await fetch(url);

			addApiLog('GET', url, res.ok, res.status);

			if (!res.ok) {
				alert('Could not download file');
				return;
			}

			const blob = await res.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = file.filename;
			document.body.appendChild(a);
			a.click();

			a.remove();
			window.URL.revokeObjectURL(downloadUrl);
		} catch (e) {
			addApiLog('GET', url, false, 0, e.message);
		}
	}

	onMount(loadDetails);
</script>

<div class="mx-auto max-w-2xl p-6 space-y-6">
	<a href={resolve('/')} class="text-blue-600 hover:underline">← Back to list</a>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 bg-slate-200 rounded w-3/4"></div>
			<div class="h-4 bg-slate-200 rounded w-full"></div>
			<div class="h-24 bg-slate-200 rounded w-full"></div>
		</div>
	{:else if error}
		<div class="p-4 bg-red-50 text-red-700 rounded border border-red-200">
			{error}
		</div>
	{:else if message}
		<div class="flex items-center gap-3 bg-slate-50 px-4 py-2 mt-4">
			<span class="rounded bg-indigo-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
				GET
			</span>
			<h3 class="font-mono text-xs font-semibold text-slate-500">
				/api/v1.0/messages/{message.id}
			</h3>
		</div>
		<div class="bg-white rounded-xl shadow-sm border p-8 space-y-6">
			<header class="border-b pb-4">
				<h1 class="text-3xl font-bold text-slate-900">{message.subject}</h1>
				<p class="text-sm text-slate-500 mt-2">ID: {message.id}</p>
			</header>

			<section>
				<h2 class="text-sm font-semibold text-slate-400 uppercase mb-2">Recipients</h2>
				<div class="flex flex-wrap gap-2">
					{#each message.recipients as r (r.id)}
            <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-100">
              {r.email}
            </span>
					{/each}
				</div>
			</section>

			<section class="bg-slate-50 p-6 rounded-lg border italic text-slate-700 whitespace-pre-wrap">
				{message.content}
			</section>

			{#if message.attachments && message.attachments.length > 0}
				<section>
					<div class="flex items-center gap-3 bg-slate-50 px-4 py-2 my-4">
						<span class="rounded bg-indigo-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
							GET
						</span>
						<h3 class="font-mono text-xs font-semibold text-slate-500">
							/api/v1.0/attachments/{"{id}"}/download
						</h3>
					</div>
					<h2 class="text-sm font-semibold text-slate-400 uppercase mb-2">Attachments</h2>
					<ul class="divide-y border rounded-lg overflow-hidden">
						{#each message.attachments as file (file.filename)}
							<li class="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
								<span class="text-sm">{file.filename}</span>
								<button
									on:click={() => handleDownload(file)}
									class="text-blue-600 text-sm font-medium hover:text-blue-800 bg-transparent border-none cursor-pointer p-0"
								>
									Download
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</div>