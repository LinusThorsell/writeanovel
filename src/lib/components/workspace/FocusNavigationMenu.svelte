<script lang="ts">
	import {
		BookOpen,
		ChevronDown,
		ChevronRight,
		CircleUserRound,
		FileText,
		GitBranch,
		ListPlus,
		MapPinned,
		Plus,
		ScrollText
	} from '@lucide/svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import { documentsOfKind } from '$lib/domain/ordering';
	import type { DocumentKind, MatterType, NoteKind } from '$lib/domain/types';

	let { model }: { model: WriteANovelState } = $props();
	let navigationOpen = $state(false);
	let frontMatterOpen = $state(false);
	let backMatterOpen = $state(false);
	let navigationMenu: HTMLElement | undefined;

	const captureNavigationMenu: Attachment<HTMLElement> = (element) => {
		navigationMenu = element;
		return () => {
			if (navigationMenu === element) navigationMenu = undefined;
		};
	};

	const activeTitle = $derived(
		model.activeDocument?.title ?? model.activeNote?.title ?? 'Choose a section'
	);
	const frontPages = $derived(
		model.workspace ? documentsOfKind(model.workspace.documents, 'front-matter') : []
	);
	const chapters = $derived(
		model.workspace ? documentsOfKind(model.workspace.documents, 'chapter') : []
	);
	const backPages = $derived(
		model.workspace ? documentsOfKind(model.workspace.documents, 'back-matter') : []
	);
	const noteSections: Array<{ kind: NoteKind; label: string; icon: typeof CircleUserRound }> = [
		{ kind: 'character', label: 'Characters', icon: CircleUserRound },
		{ kind: 'environment', label: 'Places', icon: MapPinned },
		{ kind: 'plotline', label: 'Plotlines', icon: GitBranch },
		{ kind: 'planning', label: 'Planning', icon: ListPlus }
	];
	const frontPageOptions: Array<{ type: MatterType; label: string }> = [
		{ type: 'title-page', label: 'Title page' },
		{ type: 'copyright', label: 'Copyright' },
		{ type: 'dedication', label: 'Dedication' },
		{ type: 'epigraph', label: 'Epigraph' },
		{ type: 'preface', label: 'Preface' },
		{ type: 'custom', label: 'Custom page' }
	];
	const backPageOptions: Array<{ type: MatterType; label: string }> = [
		{ type: 'acknowledgements', label: 'Acknowledgements' },
		{ type: 'about-author', label: 'About the author' },
		{ type: 'custom', label: 'Custom page' }
	];

	function closeNavigation(): void {
		if (navigationMenu?.matches(':popover-open')) navigationMenu.hidePopover();
		navigationOpen = false;
		frontMatterOpen = false;
		backMatterOpen = false;
	}

	function toggleNavigation(): void {
		if (!navigationMenu) return;
		if (navigationMenu.matches(':popover-open')) {
			closeNavigation();
		} else {
			navigationMenu.showPopover();
			navigationOpen = true;
		}
	}

	function handleNavigationToggle(event: Event): void {
		navigationOpen = (event.currentTarget as HTMLElement).matches(':popover-open');
		if (!navigationOpen) {
			frontMatterOpen = false;
			backMatterOpen = false;
		}
	}

	function selectItem(itemId: string): void {
		model.selectItem(itemId);
		closeNavigation();
	}

	async function addChapter(): Promise<void> {
		closeNavigation();
		await model.addChapter();
	}

	async function addMatter(
		kind: Exclude<DocumentKind, 'chapter'>,
		matterType: MatterType
	): Promise<void> {
		closeNavigation();
		await model.addMatter(kind, matterType);
	}

	async function addNote(kind: NoteKind): Promise<void> {
		closeNavigation();
		await model.addNote(kind);
	}
</script>

<div class="focus-navigation">
	<button
		type="button"
		class="navigation-trigger"
		aria-label={`Open focus navigation, current item: ${activeTitle}`}
		aria-controls="focus-navigation-menu"
		aria-expanded={navigationOpen}
		aria-haspopup="menu"
		onclick={toggleNavigation}
	>
		<BookOpen size={16} />
		<span>{activeTitle}</span>
		<ChevronDown size={14} />
	</button>

	<nav
		id="focus-navigation-menu"
		class="focus-navigation-menu"
		aria-label="Work and notes"
		popover="auto"
		{@attach captureNavigationMenu}
		ontoggle={handleNavigationToggle}
	>
		<div class="navigation-group-title"><span>Work</span><ChevronRight size={15} /></div>

		<section>
			<div class="navigation-section-heading">
				<span>Front pages</span>
				<div class="add-pages">
					<button
						type="button"
						class="add-button"
						aria-label="Add a front page from focus navigation"
						aria-expanded={frontMatterOpen}
						onclick={() => (frontMatterOpen = !frontMatterOpen)}><Plus size={15} /></button
					>
					{#if frontMatterOpen}
						<div class="page-options">
							{#each frontPageOptions as option (option.type)}
								<button type="button" onclick={() => addMatter('front-matter', option.type)}>
									{option.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			{#each frontPages as document (document.id)}
				<button
					type="button"
					class="navigation-item"
					class:active={model.activeItemId === document.id}
					aria-label={`Open front page: ${document.title}`}
					onclick={() => selectItem(document.id)}
				>
					<FileText size={14} /><span>{document.title}</span>
				</button>
			{/each}
		</section>

		<section>
			<div class="navigation-section-heading">
				<span>Chapters</span>
				<button
					type="button"
					class="add-button"
					aria-label="Add chapter from focus navigation"
					title="Add a new chapter"
					onclick={addChapter}><Plus size={15} /></button
				>
			</div>
			{#each chapters as document, index (document.id)}
				<button
					type="button"
					class="navigation-item"
					class:active={model.activeItemId === document.id}
					aria-label={`Open chapter ${index + 1}: ${document.title}`}
					onclick={() => selectItem(document.id)}
				>
					<span class="chapter-number">{index + 1}</span><span>{document.title}</span>
				</button>
			{/each}
		</section>

		<section>
			<div class="navigation-section-heading">
				<span>Back pages</span>
				<div class="add-pages">
					<button
						type="button"
						class="add-button"
						aria-label="Add a back page from focus navigation"
						aria-expanded={backMatterOpen}
						onclick={() => (backMatterOpen = !backMatterOpen)}><Plus size={15} /></button
					>
					{#if backMatterOpen}
						<div class="page-options">
							{#each backPageOptions as option (option.type)}
								<button type="button" onclick={() => addMatter('back-matter', option.type)}>
									{option.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			{#each backPages as document (document.id)}
				<button
					type="button"
					class="navigation-item"
					class:active={model.activeItemId === document.id}
					aria-label={`Open back page: ${document.title}`}
					onclick={() => selectItem(document.id)}
				>
					<ScrollText size={14} /><span>{document.title}</span>
				</button>
			{/each}
		</section>

		<div class="navigation-group-title notes-title">
			<span>Notes</span><ChevronRight size={15} />
		</div>

		{#each noteSections as noteSection (noteSection.kind)}
			{@const NoteIcon = noteSection.icon}
			<section>
				<div class="navigation-section-heading">
					<span class="section-with-icon"><NoteIcon size={14} />{noteSection.label}</span>
					<button
						type="button"
						class="add-button"
						aria-label={`Add ${noteSection.label.toLowerCase()} from focus navigation`}
						onclick={() => addNote(noteSection.kind)}><Plus size={15} /></button
					>
				</div>
				{#each model.workspace?.notes.filter((note) => note.kind === noteSection.kind) ?? [] as note (note.id)}
					<button
						type="button"
						class="navigation-item note-item"
						class:active={model.activeItemId === note.id}
						aria-label={`Open ${noteSection.label.toLowerCase()}: ${note.title}`}
						onclick={() => selectItem(note.id)}
					>
						<span>{note.title}</span>
					</button>
				{/each}
			</section>
		{/each}
	</nav>
</div>

<style>
	.focus-navigation {
		position: relative;
		z-index: 22;
		flex: 0 0 auto;
	}

	.navigation-trigger {
		display: flex;
		width: min(14rem, 32vw);
		height: 2.15rem;
		align-items: center;
		gap: 0.45rem;
		padding: 0 0.55rem;
		color: var(--ink);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
		font-size: 0.74rem;
		font-weight: 750;
		list-style: none;
		cursor: pointer;
	}

	.navigation-trigger span {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.navigation-trigger[aria-expanded='true'] {
		color: var(--forest-deep);
		background: #f1eee7;
	}

	.focus-navigation-menu {
		position: fixed;
		top: 3.35rem;
		right: auto;
		bottom: auto;
		left: 0.75rem;
		width: min(23rem, calc(100vw - 1.5rem));
		max-height: calc(100vh - 4.1rem);
		max-height: calc(100dvh - 4.1rem);
		margin: 0;
		padding: 0.6rem;
		overflow-y: auto;
		color: var(--ink);
		background: #fffdf9;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: 0 18px 55px rgb(31 42 36 / 22%);
	}

	.focus-navigation-menu::backdrop {
		background: rgb(26 34 30 / 12%);
	}

	.navigation-group-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3rem 0.35rem 0.45rem;
		color: var(--forest-deep);
		font-size: 0.7rem;
		font-weight: 850;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.notes-title {
		margin-top: 0.65rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--line);
	}

	section {
		margin-bottom: 0.45rem;
	}

	.navigation-section-heading {
		display: flex;
		min-height: 2rem;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.2rem 0 0.55rem;
		color: #68756f;
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.section-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.add-button {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.4rem;
		list-style: none;
		cursor: pointer;
	}

	.add-button:hover,
	.add-button[aria-expanded='true'] {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 10%);
	}

	.add-pages {
		position: relative;
	}

	.page-options {
		position: absolute;
		z-index: 26;
		top: 1.9rem;
		right: 0;
		width: 12rem;
		padding: 0.35rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		box-shadow: var(--shadow);
	}

	.page-options button {
		width: 100%;
		padding: 0.5rem 0.6rem;
		color: var(--ink);
		text-align: left;
		background: transparent;
		border: 0;
		border-radius: 0.35rem;
		font-size: 0.75rem;
	}

	.page-options button:hover {
		background: var(--paper-deep);
	}

	.navigation-item {
		display: flex;
		width: 100%;
		min-height: 2rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.55rem;
		color: var(--ink-soft);
		text-align: left;
		background: transparent;
		border: 0;
		border-radius: 0.45rem;
		font-size: 0.75rem;
	}

	.navigation-item:hover,
	.navigation-item.active {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 9%);
	}

	.navigation-item span:last-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chapter-number {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		flex: 0 0 auto;
		place-items: center;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.62rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 50%;
	}

	.note-item {
		padding-left: 1.4rem;
	}

	@media (max-width: 560px) {
		.navigation-trigger {
			width: 10rem;
		}

		.focus-navigation-menu {
			top: 3.2rem;
			left: 0.5rem;
			width: calc(100vw - 1rem);
		}
	}
</style>
