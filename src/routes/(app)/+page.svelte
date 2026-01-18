<script lang="ts">
	import type { MessageDto } from '$lib/server/domain/dto/message.dto';
	import { addApiLog } from '$lib/state/api-monitor.svelte';
	import { resolve } from '$app/paths';

	let recipient = '';
	let subject = '';
	let content = '';
	let messages: MessageDto[] = [];
	let errors: unknown = null;

	let files: FileList | null = null;
	let fileInput: HTMLInputElement;

	async function send() {
		errors = {};
		const form = new FormData();
		form.append('subject', subject);
		form.append('content', content);
		form.append('recipients', recipient.trim());

		if (files) {
			for (let i = 0; i < files.length; i++) {
				form.append('attachments', files[i]);
			}
		}

		try {
			const result = await fetch('/api/v1.0/send-email', {
				method: 'POST',
				body: form
			});

			const data = await result.json();
			if (!data.ok) {
				if (data.details) {
					errors = data.details;
					return;
				}
				errors = data.details;
				addApiLog('POST', '/api/v1.0/send-email', data.ok, result.status, data.error, data.code);
				return;
			}

			addApiLog('POST', '/api/v1.0/send-email', data.ok, result.status);

			recipient = '';
			subject = '';
			content = '';
			files = null;
			await loadMessages();
		} catch (e) {
			errors = { global: e.message}
		}
	}

	function getError(fieldName: string): string[] {
		return errors?.properties?.[fieldName]?.errors || [];
	}

	function getRecipientErrors(): string[] {
		const field = errors?.properties?.recipients;
		if (!field) return [];

		const result: string[] = [];
		if (field.errors) {
			result.push(...field.errors);
		}
		if (field.items) {
			const emailValues = recipient.split(',').map(s => s.trim()).filter(Boolean);

			field.items.forEach((item, index: number) => {
				if (item?.errors && item.errors.length > 0) {
					const emailValue = emailValues[index] || 'Unknown';
					result.push(`Email "${emailValue}": ${item.errors.join(', ')}`);
				}
			});
		}

		return result;
	}

	async function loadMessages() {
		try {
			const result = await fetch('/api/v1.0/messages');

			const data = await result.json();
			if (data.ok) {
				messages = data.result;
				addApiLog('GET', '/api/v1.0/messages', data.ok, result.status);
			}
		} catch (e) {
			errors = { global: e.message}
		}
	}

	loadMessages();
</script>

<div class="mx-auto max-w-xl space-y-4 p-6">
	<header>
		<h1 class="text-2xl font-bold text-slate-800">Mock MS Graph Mail</h1>
		{#if errors?.global}
			<div class="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">{errors.global}</div>
		{/if}
	</header>
	<div class="space-y-4">
		<div class="flex items-center gap-3 bg-slate-50 px-4 py-2">
			<span class="rounded bg-green-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
				POST
			</span>
			<h3 class="font-mono text-xs font-semibold text-slate-500">
				/api/v1.0/send-email
			</h3>
		</div>
		<div class="flex flex-col gap-1">
			<label class="text-sm font-medium text-slate-600">Recipients</label>
			<input
				bind:value={recipient}
				placeholder="user1@mail.com, user2@mail.com"
				class="w-full rounded border p-2 transition-colors
    		{getRecipientErrors().length ? 'border-red-500 bg-red-50' : 'border-slate-300'}"
			/>

			{#each getRecipientErrors() as error (error)}
				<div class="flex items-start gap-1 text-xs text-red-600 font-medium italic">
					<span>{error}</span>
				</div>
			{/each}
		</div>
		<div class="flex flex-col gap-1">
			<label class="text-sm font-medium text-slate-600">Subject</label>
				<input
					bind:value={subject}
					placeholder="Enter subject"
					class="w-full rounded border p-2 transition-colors {getError('subject').length ? 'border-red-500 bg-red-50' : 'border-slate-300'}"
				/>
				{#each getError('subject') as error (error)}
					<p class="text-xs text-red-600 font-medium">{error}</p>
				{/each}
		</div>
		<div class="flex flex-col gap-1">
			<label class="text-sm font-medium text-slate-600">Content</label>
				<textarea
					bind:value={content}
					placeholder="Type your content here..."
					rows="4"
					class="w-full rounded border p-2 transition-colors {getError('content').length ? 'border-red-500 bg-red-50' : 'border-slate-300'}"
				></textarea>
				{#each getError('content') as error (error)}
					<p class="text-xs text-red-600 font-medium">{error}</p>
					{/each}
		</div>
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-slate-600">Attachments</label>
			<span class="text-xs text-slate-500">To add multiple files, you need to select them all at once when clicking “Choose Files” :(</span>

			<div class="relative">
				<input
					type="file"
					multiple
					bind:this={fileInput}
					bind:files
					class="w-full text-sm text-slate-500
      		file:mr-4 file:py-2 file:px-4
      		file:rounded-md file:border-0
      		file:text-sm file:font-semibold
      	file:bg-blue-50 file:text-blue-700
      	hover:file:bg-blue-100 cursor-pointer"
				/>
			</div>

			{#if files && files.length > 0}
				<span class="text-xs text-slate-500">You can’t add more files once some are already selected — you need to reselect all files by clicking “Choose Files” again.</span>
				<span class="text-xs text-red-600">To remove selected file(s), click “Choose Files” and cancel the file selection.</span>
				<ul class="mt-2 space-y-2 border rounded-md p-3 bg-slate-50">
					{#each Array.from(files) as file (file.name + file.size)}
						<li class="flex flex-col text-xs">
							<div class="flex items-center justify-between text-slate-700">
								<span class="truncate font-medium">{file.name}</span>
								<span class="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#each (errors?.properties?.attachments?.errors || []) as error (error)}
				<p class="text-xs text-red-600 font-medium">{error}</p>
			{/each}
		</div>
		<button
			on:click={send}
			class="w-full rounded bg-blue-600 px-4 py-2 text-white font-semibold transition hover:bg-blue-700 disabled:bg-blue-300"
		>
			Send Email
		</button>
	</div>
	<div class="flex items-center gap-3 bg-slate-50 px-4 py-2">
			<span class="rounded bg-indigo-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
				GET
			</span>
		<h3 class="font-mono text-xs font-semibold text-slate-500">
			/api/v1.0/messages
		</h3>
	</div>
	<ul class="space-y-2">
		{#each messages as m (m.id)}
			<li class="rounded border hover:bg-slate-50 transition shadow-sm">
				<a
					href={resolve('/messages/[id]', { id: m.id })}
					class="block p-2 text-inherit no-underline"
				>
					<b>{m.subject || '(No Subject)'}</b> → {m.content}, Sent at: {m.sentAt}
				</a>
			</li>
		{/each}
	</ul>
</div>
