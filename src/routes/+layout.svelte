<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ApiMonitor from '$lib/components/api-monitor.svelte';

	let { children } = $props();
</script>

<ApiMonitor/>
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
