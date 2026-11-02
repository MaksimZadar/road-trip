<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		label,
		value,
		class: className
	}: { label: string; value: string; class?: string } = $props();
</script>

<div data-slot="stat-block" class={cn(className)}>
	<div class="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">{label}</div>
	<div class="font-heading text-2xl leading-none text-foreground">{value}</div>
</div>
