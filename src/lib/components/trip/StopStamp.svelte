<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { class: className }: { class?: string } = $props();
</script>

<div
	aria-hidden="true"
	data-slot="stop-stamp"
	class={cn(
		'pointer-events-none absolute size-16 rounded-full border-4 border-double border-primary bg-card/90 select-none',
		'flex rotate-[-12deg] items-center justify-center',
		className
	)}
>
	<span
		class="text-center text-[9px] leading-tight font-bold tracking-[0.15em] text-primary uppercase"
	>
		VISITED
	</span>
</div>
