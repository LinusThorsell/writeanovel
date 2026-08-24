<script lang="ts">
	import type { Snippet } from 'svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import MarketingHeader from '$lib/components/marketing/MarketingHeader.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<a class="skip-link" href="#main-content">Skip to content</a>
<MarketingHeader />
<main id="main-content">
	{@render children()}
</main>
<MarketingFooter />

<style>
	.skip-link {
		position: fixed;
		z-index: 100;
		top: 0.6rem;
		left: 0.6rem;
		padding: 0.6rem 0.8rem;
		color: white;
		background: var(--forest-deep);
		border-radius: 0.45rem;
		transform: translateY(-150%);
	}

	.skip-link:focus {
		transform: translateY(0);
	}
</style>
