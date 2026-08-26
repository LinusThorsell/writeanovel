<script lang="ts">
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';
	import { Feather } from '@lucide/svelte';

	let Application = $state<Component>();
	let failed = $state(false);

	onMount(() => {
		import('$lib/components/application/NovelApplication.svelte')
			.then((module) => {
				Application = module.default;
			})
			.catch(() => {
				failed = true;
			});
	});
</script>

<svelte:head>
	<title>Writing Studio | WriteANovel</title>
	<meta
		name="description"
		content="The private WriteANovel browser studio for drafting, planning, typesetting, and exporting your novels."
	/>
	<meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

{#if Application}
	<Application />
{:else}
	<main class="app-loader" aria-live="polite" aria-busy={!failed}>
		<div><Feather size={28} /></div>
		<p class="eyebrow">WriteANovel</p>
		<h1>{failed ? 'The studio could not open' : 'Opening your writing studio…'}</h1>
		<p>
			{failed
				? 'Reload the page to try again. Your writing is safe.'
				: 'Getting your novels ready.'}
		</p>
	</main>
{/if}

<style>
	.app-loader {
		display: grid;
		min-height: 100vh;
		min-height: 100dvh;
		place-content: center;
		justify-items: center;
		padding: max(2rem, env(safe-area-inset-top)) max(2rem, env(safe-area-inset-right))
			max(2rem, env(safe-area-inset-bottom)) max(2rem, env(safe-area-inset-left));
		text-align: center;
	}

	.app-loader > div {
		display: grid;
		width: 3.5rem;
		height: 3.5rem;
		place-items: center;
		margin-bottom: 1rem;
		color: white;
		background: var(--forest);
		border-radius: 0.9rem;
		box-shadow: var(--shadow);
	}

	.app-loader h1 {
		margin: 0.65rem 0 0.5rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.65rem;
		font-weight: 400;
	}

	.app-loader > p:last-child {
		max-width: 30rem;
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.82rem;
		line-height: 1.6;
	}
</style>
