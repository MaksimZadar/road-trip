<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import ModeToggle from '$lib/components/ModeToggle.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />

<div class="px-4 sm:px-6 lg:px-8">
	{@render children()}
</div>

<div class="fixed bottom-4 left-4 z-50">
	<ModeToggle />
</div>
