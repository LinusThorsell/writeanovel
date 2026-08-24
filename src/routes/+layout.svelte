<script lang="ts">
	import type { Snippet } from 'svelte';
	import '@fontsource-variable/manrope';
	import '@fontsource/libre-baskerville/400.css';
	import '@fontsource/libre-baskerville/400-italic.css';
	import '@fontsource/libre-baskerville/700.css';
	import './app.css';

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
