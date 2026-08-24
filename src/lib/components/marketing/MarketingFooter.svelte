<script lang="ts">
	import { Feather, HardDrive, ShieldCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<footer>
	<div class="footer-grid">
		<div class="footer-brand">
			<span><Feather size={21} /></span>
			<div>
				<strong>WriteANovel</strong>
				<p>A private-first place to plan, write, typeset, and finish a book.</p>
			</div>
		</div>
		<div class="footer-links">
			<div>
				<strong>Explore</strong>
				<a href={resolve('/features')}>Features</a>
				<a href={resolve('/novel-planning')}>Novel planning</a>
				<a href={resolve('/book-typesetting')}>Typesetting and export</a>
			</div>
			<div>
				<strong>Start</strong>
				<a href={resolve('/offline-novel-writing')}>Offline writing</a>
				<a href={resolve('/app')}>Open writing studio</a>
			</div>
		</div>
	</div>
	<div class="footer-bottom">
		<span><HardDrive size={15} />Free drafts stay in your browser.</span>
		<span><ShieldCheck size={15} />Cloud storage is an explicit premium choice.</span>
	</div>
</footer>

<style>
	footer {
		margin-top: 6rem;
		color: #e8efeb;
		background: var(--forest-deep);
	}

	.footer-grid,
	.footer-bottom {
		width: min(72rem, calc(100% - 2rem));
		margin: 0 auto;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 1fr) 1fr;
		gap: 4rem;
		padding: 4rem 0 3rem;
	}

	.footer-brand {
		display: flex;
		align-items: flex-start;
		gap: 0.8rem;
	}

	.footer-brand > span {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		flex: 0 0 auto;
		place-items: center;
		color: var(--forest-deep);
		background: #e5b18c;
		border-radius: 0.7rem;
	}

	.footer-brand strong {
		font-family: 'Libre Baskerville', serif;
	}

	.footer-brand p {
		max-width: 30rem;
		margin: 0.5rem 0 0;
		color: #bdccc5;
		font-size: 0.83rem;
		line-height: 1.6;
	}

	.footer-links {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}

	.footer-links > div {
		display: grid;
		align-content: start;
		gap: 0.65rem;
	}

	.footer-links strong {
		margin-bottom: 0.2rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.footer-links a {
		color: #bdccc5;
		font-size: 0.78rem;
		text-decoration: none;
	}

	.footer-links a:hover {
		color: white;
	}

	.footer-bottom {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding: 1rem 0 1.4rem;
		color: #9fb2a9;
		border-top: 1px solid rgb(255 255 255 / 10%);
		font-size: 0.7rem;
	}

	.footer-bottom span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	@media (max-width: 700px) {
		.footer-grid {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}
	}
</style>
