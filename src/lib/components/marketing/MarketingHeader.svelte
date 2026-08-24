<script lang="ts">
	import { Feather } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<header class="marketing-header">
	<a class="brand" href={resolve('/')} aria-label="WriteANovel home">
		<span><Feather size={20} /></span>
		<strong>WriteANovel</strong>
	</a>
	<nav aria-label="Main navigation">
		<a href={resolve('/features')}>Features</a>
		<a href={resolve('/offline-novel-writing')}>Write offline</a>
		<a href={resolve('/novel-planning')}>Plan a novel</a>
		<a href={resolve('/book-typesetting')}>Typeset & export</a>
	</nav>
	<a class="studio-link" href={resolve('/app')}>Open writing studio</a>
</header>

<style>
	.marketing-header {
		display: grid;
		width: min(76rem, calc(100% - 2rem));
		min-height: 5rem;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 2rem;
		margin: 0 auto;
	}

	.brand,
	nav,
	.studio-link {
		display: flex;
		align-items: center;
	}

	.brand {
		gap: 0.65rem;
		color: var(--ink);
		text-decoration: none;
	}

	.brand > span {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.65rem;
	}

	.brand strong {
		font-family: 'Libre Baskerville', serif;
		font-size: 1.05rem;
	}

	nav {
		justify-content: center;
		gap: clamp(0.8rem, 2vw, 1.7rem);
	}

	nav a {
		color: var(--ink-soft);
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}

	nav a:hover {
		color: var(--forest);
	}

	.studio-link {
		min-height: 2.65rem;
		justify-content: center;
		padding: 0.6rem 0.9rem;
		color: white;
		background: var(--forest);
		border-radius: 0.7rem;
		font-size: 0.76rem;
		font-weight: 800;
		text-decoration: none;
	}

	.studio-link:hover {
		background: var(--forest-deep);
	}

	@media (max-width: 900px) {
		.marketing-header {
			grid-template-columns: 1fr auto;
			gap: 1rem;
		}

		nav {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-content: flex-start;
			overflow-x: auto;
			padding-bottom: 0.8rem;
		}

		nav a {
			white-space: nowrap;
		}
	}

	@media (max-width: 520px) {
		.marketing-header {
			width: min(100% - 1.25rem, 76rem);
		}

		.studio-link {
			padding-inline: 0.7rem;
			font-size: 0.7rem;
		}
	}
</style>
