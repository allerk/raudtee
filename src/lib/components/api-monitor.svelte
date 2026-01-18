<script lang="ts">
	import { apiLogs } from '$lib/state/api-monitor.svelte';
</script>

<div class="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2 pointer-events-none">
	<h3 class="px-2 text-[10px] font-bold uppercase text-slate-400">API Response Monitor</h3>

	{#each apiLogs as log (log.time + log.url)}
		<div
			class="pointer-events-auto flex flex-col rounded border bg-white/90 p-2 font-mono text-[11px] shadow-lg backdrop-blur"
		>
			<div class="flex items-center justify-between w-full">
				<div class="mr-2 flex items-center gap-2 truncate">
					<span class={log.ok ? 'text-green-600' : 'text-red-600'}>●</span>
					<span class="font-bold">{log.method}</span>
					<span class="truncate text-slate-400" title={log.url}>{log.url}</span>
					<span class="text-[9px] text-slate-300">{log.time}</span>
				</div>

				<div class="flex flex-shrink-0">
      <span class="rounded px-1.5 {log.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
       {log.status}
      </span>
				</div>
			</div>

			{#if !log.ok && (log.error || log.code)}
				<div
					class="mt-2 border-t border-red-100 pt-2 text-[10px] text-red-600"
				>
					{#if log.code}
						<span class="font-bold uppercase">[{log.code}]</span>
					{/if}
					<span class="block mt-0.5">{log.error || 'Unknown error'}</span>
				</div>
			{/if}
		</div>
	{/each}
</div>