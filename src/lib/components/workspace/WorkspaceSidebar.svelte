<script lang="ts">
	import {
		BookOpen,
		ChevronDown,
		CircleUserRound,
		FilePlus2,
		FileText,
		GitBranch,
		ListPlus,
		MapPinned,
		Plus,
		ScrollText
	} from '@lucide/svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import { documentsOfKind } from '$lib/domain/ordering';
	import type { DocumentKind, MatterType, NoteKind } from '$lib/domain/types';

	let { model }: { model: WriteANovelState } = $props();
	let frontMatterOpen = $state(false);
	let backMatterOpen = $state(false);

	const noteSections: Array<{ kind: NoteKind; label: string; icon: typeof CircleUserRound }> = [
		{ kind: 'character', label: 'Characters', icon: CircleUserRound },
		{ kind: 'environment', label: 'Places', icon: MapPinned },
		{ kind: 'plotline', label: 'Plotlines', icon: GitBranch },
		{ kind: 'planning', label: 'Planning', icon: ListPlus }
	];

	async function addMatter(
		kind: Exclude<DocumentKind, 'chapter'>,
		matterType: MatterType
	): Promise<void> {
		frontMatterOpen = false;
		backMatterOpen = false;
		await model.addMatter(kind, matterType);
	}
</script>

{#if model.workspace}
	<aside aria-label="Novel contents">
		<div class="project-mark">
			<div class="book-icon"><BookOpen size={20} /></div>
			<div>
				<strong>{model.workspace.project.title}</strong>
				<span>{model.workspace.project.author || 'No author yet'}</span>
			</div>
		</div>

		<!-- Scrollable regions must be keyboard-focusable. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<nav aria-label="Novel sections" tabindex="0">
			<section>
				<div class="section-heading">
					<span>Front pages</span>
					<details class="add-menu" bind:open={frontMatterOpen}>
						<summary aria-label="Add a front page"><Plus size={16} /></summary>
						<div class="menu">
							<button type="button" onclick={() => addMatter('front-matter', 'title-page')}
								>Title page</button
							>
							<button type="button" onclick={() => addMatter('front-matter', 'copyright')}
								>Copyright</button
							>
							<button type="button" onclick={() => addMatter('front-matter', 'dedication')}
								>Dedication</button
							>
							<button type="button" onclick={() => addMatter('front-matter', 'epigraph')}
								>Epigraph</button
							>
							<button type="button" onclick={() => addMatter('front-matter', 'preface')}
								>Preface</button
							>
							<button type="button" onclick={() => addMatter('front-matter', 'custom')}
								>Custom page</button
							>
						</div>
					</details>
				</div>
				{#each documentsOfKind(model.workspace.documents, 'front-matter') as document (document.id)}
					<button
						class:active={model.activeItemId === document.id}
						class="nav-item"
						type="button"
						onclick={() => model.selectItem(document.id)}
					>
						<FileText size={15} /><span>{document.title}</span>
					</button>
				{/each}
			</section>

			<section>
				<div class="section-heading">
					<span>Chapters</span>
					<button
						class="heading-action"
						type="button"
						aria-label="Add chapter"
						onclick={() => model.addChapter()}><Plus size={16} /></button
					>
				</div>
				{#each documentsOfKind(model.workspace.documents, 'chapter') as document, index (document.id)}
					<div class="chapter-row" class:active={model.activeItemId === document.id}>
						<button
							class="chapter-main"
							type="button"
							onclick={() => model.selectItem(document.id)}
						>
							<span class="chapter-number">{index + 1}</span><span>{document.title}</span>
						</button>
						<button
							class="insert-after"
							type="button"
							aria-label={`Insert chapter after ${document.title}`}
							title="Insert chapter here"
							onclick={() => model.addChapter(document.id)}><FilePlus2 size={14} /></button
						>
					</div>
				{/each}
			</section>

			<section>
				<div class="section-heading">
					<span>Back pages</span>
					<details class="add-menu" bind:open={backMatterOpen}>
						<summary aria-label="Add a back page"><Plus size={16} /></summary>
						<div class="menu">
							<button type="button" onclick={() => addMatter('back-matter', 'acknowledgements')}
								>Acknowledgements</button
							>
							<button type="button" onclick={() => addMatter('back-matter', 'about-author')}
								>About the author</button
							>
							<button type="button" onclick={() => addMatter('back-matter', 'custom')}
								>Custom page</button
							>
						</div>
					</details>
				</div>
				{#each documentsOfKind(model.workspace.documents, 'back-matter') as document (document.id)}
					<button
						class:active={model.activeItemId === document.id}
						class="nav-item"
						type="button"
						onclick={() => model.selectItem(document.id)}
					>
						<ScrollText size={15} /><span>{document.title}</span>
					</button>
				{/each}
			</section>

			<div class="story-divider"><span>Story notes</span><ChevronDown size={14} /></div>

			{#each noteSections as noteSection (noteSection.kind)}
				{@const NoteIcon = noteSection.icon}
				<section>
					<div class="section-heading">
						<span class="heading-with-icon"><NoteIcon size={14} />{noteSection.label}</span>
						<button
							class="heading-action"
							type="button"
							aria-label={`Add ${noteSection.label.toLowerCase()}`}
							onclick={() => model.addNote(noteSection.kind)}><Plus size={16} /></button
						>
					</div>
					{#each model.workspace.notes.filter((note) => note.kind === noteSection.kind) as note (note.id)}
						<button
							class:active={model.activeItemId === note.id}
							class="nav-item note-item"
							type="button"
							onclick={() => model.selectItem(note.id)}
						>
							<span>{note.title}</span>
						</button>
					{/each}
				</section>
			{/each}
		</nav>
	</aside>
{/if}

<style>
	aside {
		display: flex;
		min-width: 0;
		height: 100%;
		flex-direction: column;
		background: #f5f1e9;
		border-right: 1px solid var(--line);
	}

	.project-mark {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 4.6rem;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--line);
	}

	.book-icon {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 auto;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.6rem;
	}

	.project-mark div:last-child {
		min-width: 0;
	}

	.project-mark strong,
	.project-mark span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-mark strong {
		font-family: 'Libre Baskerville', serif;
		font-size: 0.9rem;
	}

	.project-mark span {
		margin-top: 0.15rem;
		color: var(--ink-soft);
		font-size: 0.72rem;
	}

	nav {
		min-height: 0;
		flex: 1 1 auto;
		padding: 0.8rem 0.55rem 4rem;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		scrollbar-color: #71867c #e7e0d4;
		scrollbar-gutter: stable;
	}

	nav:focus-visible {
		outline: 2px solid var(--copper);
		outline-offset: -3px;
	}

	nav::-webkit-scrollbar {
		width: 0.8rem;
	}

	nav::-webkit-scrollbar-track {
		background: #e7e0d4;
		border-left: 1px solid rgb(39 72 59 / 8%);
	}

	nav::-webkit-scrollbar-thumb {
		min-height: 2.75rem;
		background: #71867c;
		background-clip: padding-box;
		border: 3px solid transparent;
		border-radius: 999px;
	}

	nav::-webkit-scrollbar-thumb:hover {
		background: var(--forest);
		background-clip: padding-box;
	}

	nav::-webkit-scrollbar-thumb:active {
		background: var(--forest-deep);
		background-clip: padding-box;
	}

	@media (forced-colors: active) {
		nav {
			scrollbar-color: auto;
		}

		nav:focus-visible {
			outline-color: CanvasText;
		}
	}

	section {
		margin-bottom: 0.85rem;
	}

	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 1.85rem;
		padding: 0 0.45rem;
		font-size: 0.67rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #68756f;
	}

	.heading-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.heading-action,
	.add-menu summary {
		display: grid;
		width: 1.75rem;
		height: 1.75rem;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.4rem;
		list-style: none;
		cursor: pointer;
	}

	.heading-action:hover,
	.add-menu summary:hover {
		background: rgb(39 72 59 / 10%);
	}

	.add-menu {
		position: relative;
	}

	.add-menu summary::-webkit-details-marker {
		display: none;
	}

	.menu {
		position: absolute;
		z-index: 15;
		top: 1.9rem;
		right: 0;
		width: 12rem;
		padding: 0.35rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.6rem;
		box-shadow: var(--shadow);
	}

	.menu button {
		width: 100%;
		padding: 0.55rem 0.65rem;
		text-align: left;
		background: transparent;
		border: 0;
		border-radius: 0.4rem;
		font-size: 0.78rem;
	}

	.menu button:hover {
		background: var(--paper-deep);
	}

	.nav-item,
	.chapter-row {
		width: 100%;
		min-height: 2.25rem;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.5rem;
		font-size: 0.78rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}

	.nav-item span,
	.chapter-main span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav-item:hover,
	.nav-item.active,
	.chapter-row:hover,
	.chapter-row.active {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 9%);
	}

	.chapter-row {
		display: flex;
		align-items: center;
	}

	.chapter-main {
		display: flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0 0.35rem 0.45rem;
		color: inherit;
		text-align: left;
		background: transparent;
		border: 0;
	}

	.chapter-number {
		display: grid;
		width: 1.4rem;
		height: 1.4rem;
		flex: 0 0 auto;
		place-items: center;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.65rem;
		background: rgb(255 255 255 / 72%);
		border: 1px solid var(--line);
		border-radius: 50%;
	}

	.insert-after {
		display: grid;
		width: 1.9rem;
		height: 1.9rem;
		place-items: center;
		padding: 0;
		opacity: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.4rem;
	}

	.chapter-row:hover .insert-after,
	.chapter-row:focus-within .insert-after {
		opacity: 1;
	}

	.note-item {
		padding-left: 1.15rem;
	}

	.story-divider {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 1.25rem 0.35rem 0.85rem;
		padding-top: 1rem;
		color: var(--copper);
		border-top: 1px solid var(--line);
		font-size: 0.68rem;
		font-weight: 850;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
</style>
