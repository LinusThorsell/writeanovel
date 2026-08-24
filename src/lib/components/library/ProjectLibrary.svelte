<script lang="ts">
	import { BookOpen, Cloud, CloudOff, Feather, HardDrive, Plus, UserRound } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let { model }: { model: WriteANovelState } = $props();
	let creating = $state(false);
	let title = $state('');
	let author = $state('');
	let online = $state(true);
	let createError = $state<string>();

	async function createNovel(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		createError = undefined;
		try {
			await model.createProject(title, author);
			creating = false;
			title = '';
			author = '';
		} catch (error) {
			createError = error instanceof Error ? error.message : 'The novel could not be created.';
		}
	}

	function readableDate(value: string): string {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}
</script>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="library-page">
	<header class="site-header">
		<a class="brand" href={resolve('/')} aria-label="WriteANovel home"
			><span><Feather size={21} /></span><strong>WriteANovel</strong></a
		>
		<div class="header-actions">
			<span class:offline={!online} class="connection"
				>{#if online}<Cloud size={15} />Online{:else}<CloudOff size={15} />Offline{/if}</span
			>
			<button class="account-button" type="button" onclick={() => (model.accountOpen = true)}
				><UserRound size={18} /><span
					>{model.user ? model.user.displayName || 'Account' : 'Premium'}</span
				>{#if model.isPremium}<i>Premium</i>{/if}</button
			>
		</div>
	</header>

	<main>
		<section class="welcome">
			<p class="eyebrow">Your writing desk</p>
			<h1>Stories worth finishing.</h1>
			<p>Write, plan, typeset, and export complete novels—even without an internet connection.</p>
		</section>

		<div class="library-heading">
			<div>
				<h2>Your novels</h2>
				<span>{model.projects.length} {model.projects.length === 1 ? 'project' : 'projects'}</span>
			</div>
			{#if model.projects.length > 0}
				<button class="button button-primary" type="button" onclick={() => (creating = true)}
					><Plus size={17} />New novel</button
				>
			{/if}
		</div>

		{#if model.loading}
			<div class="loading-grid" aria-label="Loading novels">
				<span></span><span></span><span></span>
			</div>
		{:else if model.projects.length > 0}
			<div class="project-grid">
				{#each model.projects as project (project.id)}
					<button class="project-card" type="button" onclick={() => model.openProject(project.id)}>
						<div class="book-cover">
							<BookOpen size={32} /><span>{project.title.slice(0, 1).toUpperCase()}</span>
						</div>
						<div class="project-info">
							<h3>{project.title}</h3>
							<p>{project.author || 'Author not set'}</p>
							<div>
								<span>Edited {readableDate(project.updatedAt)}</span>{#if model.isPremium}<Cloud
										size={14}
									/>{:else}<HardDrive size={14} />{/if}
							</div>
						</div>
					</button>
				{/each}
				<button class="new-card" type="button" onclick={() => (creating = true)}
					><span><Plus size={24} /></span><strong>Start another novel</strong><small
						>A blank chapter is waiting.</small
					></button
				>
			</div>
		{:else}
			<div class="empty-library">
				<div class="empty-icon"><Feather size={30} /></div>
				<h2>Your first page starts here</h2>
				<p>
					Create a novel, then add chapters, characters, places, plotlines, and book pages as you
					go.
				</p>
				<button class="button button-primary" type="button" onclick={() => (creating = true)}
					><Plus size={17} />Create your first novel</button
				>
			</div>
		{/if}
	</main>

	<footer class="privacy-note">
		<HardDrive size={16} /><span
			>{model.isPremium
				? 'Cloud-backed with a complete offline cache.'
				: 'Private by default. Free novels stay only in this browser.'}</span
		>
	</footer>
</div>

{#if creating}
	<Modal
		title="Start a new novel"
		description="You can change these details whenever you like."
		onClose={() => (creating = false)}
		width="small"
	>
		<form class="create-form" onsubmit={createNovel}>
			<label class="field"
				><span>Novel title</span><input
					bind:value={title}
					placeholder="The working title"
					required
				/></label
			>
			<label class="field"
				><span>Author name</span><input
					bind:value={author}
					placeholder="Your name or pen name"
				/></label
			>
			{#if createError}<p class="form-error" role="alert">{createError}</p>{/if}
			<button class="button button-primary" type="submit"><Feather size={17} />Create novel</button>
		</form>
	</Modal>
{/if}

<style>
	.library-page {
		min-height: 100vh;
	}

	.site-header {
		display: flex;
		height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		padding: 0 4vw;
		background: rgb(251 248 242 / 78%);
		border-bottom: 1px solid rgb(216 208 194 / 75%);
		backdrop-filter: blur(12px);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		color: var(--ink);
		text-decoration: none;
	}

	.brand > span {
		display: grid;
		width: 2.2rem;
		height: 2.2rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.62rem;
	}

	.brand strong {
		font-family: 'Libre Baskerville', serif;
		font-size: 1.05rem;
	}

	.header-actions,
	.connection,
	.account-button {
		display: flex;
		align-items: center;
	}

	.header-actions {
		gap: 0.8rem;
	}

	.connection {
		gap: 0.35rem;
		color: #53705f;
		font-size: 0.72rem;
	}

	.connection.offline {
		color: #9a5d3f;
	}

	.account-button {
		gap: 0.45rem;
		padding: 0.5rem 0.7rem;
		color: var(--ink);
		background: white;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 700;
	}

	.account-button i {
		padding: 0.15rem 0.4rem;
		color: #7f452c;
		background: #f5dac8;
		border-radius: 999px;
		font-size: 0.57rem;
		font-style: normal;
		text-transform: uppercase;
	}

	main {
		width: min(72rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 5rem 0 6rem;
	}

	.welcome {
		max-width: 43rem;
		margin-bottom: 4rem;
	}

	.welcome h1 {
		margin: 0.5rem 0 0.85rem;
		font-family: 'Libre Baskerville', serif;
		font-size: clamp(2.4rem, 6vw, 4.7rem);
		font-weight: 400;
		line-height: 1.05;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}

	.welcome > p:last-child {
		max-width: 38rem;
		margin: 0;
		color: var(--ink-soft);
		font-size: 1rem;
		line-height: 1.65;
	}

	.library-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.library-heading h2,
	.library-heading span {
		display: inline;
	}

	.library-heading h2 {
		margin: 0;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.25rem;
	}

	.library-heading span {
		margin-left: 0.6rem;
		color: var(--ink-soft);
		font-size: 0.75rem;
	}

	.project-grid,
	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.project-card,
	.new-card {
		display: grid;
		min-height: 13rem;
		padding: 1rem;
		text-align: left;
		background: rgb(251 248 242 / 85%);
		border: 1px solid var(--line);
		border-radius: 0.9rem;
		box-shadow: 0 5px 18px rgb(40 45 41 / 4%);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.project-card {
		grid-template-columns: 5.2rem 1fr;
		gap: 1rem;
	}

	.project-card:hover,
	.new-card:hover {
		transform: translateY(-3px);
		border-color: #aaa293;
		box-shadow: var(--shadow);
	}

	.book-cover {
		position: relative;
		display: grid;
		aspect-ratio: 2 / 3;
		align-self: start;
		place-items: center;
		overflow: hidden;
		color: #e9d2bd;
		background: linear-gradient(145deg, rgb(255 255 255 / 12%), transparent 45%), var(--forest);
		border-radius: 0.32rem 0.6rem 0.6rem 0.32rem;
		box-shadow: inset 4px 0 0 rgb(0 0 0 / 10%);
	}

	.book-cover span {
		position: absolute;
		font-family: 'Libre Baskerville', serif;
		font-size: 3.4rem;
		opacity: 0.11;
	}

	.project-info {
		display: flex;
		min-width: 0;
		flex-direction: column;
	}

	.project-info h3 {
		margin: 0.25rem 0 0.3rem;
		color: var(--ink);
		font-family: 'Libre Baskerville', serif;
		font-size: 1rem;
		line-height: 1.4;
	}

	.project-info p {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.73rem;
	}

	.project-info div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: auto;
		color: #77827c;
		font-size: 0.64rem;
	}

	.new-card {
		place-items: center;
		align-content: center;
		color: var(--ink-soft);
		text-align: center;
		background: transparent;
		border-style: dashed;
	}

	.new-card > span {
		display: grid;
		width: 3rem;
		height: 3rem;
		place-items: center;
		background: rgb(39 72 59 / 8%);
		border-radius: 50%;
	}

	.new-card strong {
		margin-top: 0.7rem;
		color: var(--ink);
	}

	.new-card small {
		margin-top: 0.2rem;
	}

	.empty-library {
		padding: 4.5rem 1.5rem;
		text-align: center;
		background: rgb(251 248 242 / 65%);
		border: 1px dashed #b9b1a3;
		border-radius: 1rem;
	}

	.empty-icon {
		display: grid;
		width: 4rem;
		height: 4rem;
		margin: 0 auto;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 1.1rem;
		transform: rotate(-3deg);
	}

	.empty-library h2 {
		margin: 1.2rem 0 0.4rem;
		font-family: 'Libre Baskerville', serif;
	}

	.empty-library p {
		max-width: 31rem;
		margin: 0 auto 1.3rem;
		color: var(--ink-soft);
		line-height: 1.55;
	}

	.loading-grid span {
		height: 13rem;
		background: linear-gradient(90deg, #e3ddd2, #f3eee5, #e3ddd2);
		background-size: 200% 100%;
		border-radius: 0.9rem;
		animation: shimmer 1.4s infinite;
	}

	.privacy-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 1.2rem;
		color: var(--ink-soft);
		border-top: 1px solid var(--line);
		font-size: 0.72rem;
	}

	.create-form {
		display: grid;
		gap: 1rem;
	}

	.form-error {
		margin: 0;
		color: var(--danger);
		font-size: 0.75rem;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	@media (max-width: 620px) {
		.site-header {
			padding: 0 0.8rem;
		}

		.connection,
		.account-button > span,
		.account-button i {
			display: none;
		}

		main {
			padding-top: 3.2rem;
		}

		.welcome {
			margin-bottom: 2.6rem;
		}

		.library-heading {
			align-items: stretch;
			flex-direction: column;
		}

		.project-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
