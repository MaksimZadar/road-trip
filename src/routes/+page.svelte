<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<div
	class="container mx-auto flex min-h-screen flex-col items-center justify-center py-10 text-center"
>
	<h1 class="mb-4 text-5xl font-extrabold tracking-tight">Road Trip Planner</h1>
	<p class="mb-8 max-w-2xl text-xl text-muted-foreground">
		Plan your next adventure, discover new places, and keep track of all your road trips in one
		place.
	</p>
	<div class="flex gap-4">
		<Button size="lg" href="/trips">View My Trips</Button>
		<Button size="lg" variant="outline" href="/trips/new">Start New Trip</Button>
	</div>
</div>
