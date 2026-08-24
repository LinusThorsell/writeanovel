<script lang="ts">
	import {
		ArrowLeft,
		ChevronDown,
		Cloud,
		CloudOff,
		Download,
		FileText,
		PanelLeft,
		Settings,
		UserRound
	} from '@lucide/svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import InstallApplicationButton from '$lib/components/application/InstallApplicationButton.svelte';
	import BookSettingsModal from '$lib/components/settings/BookSettingsModal.svelte';
	import EditorPane from './EditorPane.svelte';
	import WorkspaceSidebar from './WorkspaceSidebar.svelte';

	let { model }: { model: WriteANovelState } = $props();
	let sidebarOpen = $state(false);
	let exportOpen = $state(false);

	async function exportBook(format: 'pdf' | 'epub'): Promise<void> {
		exportOpen = false;
		await model.export(format);
	}
</script>

<div class="workspace-page">
	<header class="topbar">
		<div class="topbar-left">
			<button
				class="icon-button"
				type="button"
				aria-label="Back to your novels"
				title="All novels"
				onclick={() => model.closeProject()}><ArrowLeft size={19} /></button
			>
			<button
				class="icon-button mobile-sidebar"
				type="button"
				aria-label="Open novel contents"
				onclick={() => (sidebarOpen = !sidebarOpen)}><PanelLeft size={19} /></button
			>
			<strong>WriteANovel</strong>
		</div>

		<div class="topbar-actions">
			<InstallApplicationButton variant="dark" />
			<span
				class="compact-status"
				class:warning={model.syncStatus === 'error' || model.syncStatus === 'offline'}
			>
				{#if model.syncStatus === 'local'}Local only{:else if model.syncStatus === 'syncing'}<Cloud
						size={14}
					/>Syncing{:else if model.syncStatus === 'synced'}<Cloud size={14} />Synced{:else}<CloudOff
						size={14}
					/>Offline{/if}
			</span>
			<button class="toolbar-button" type="button" onclick={() => (model.settingsOpen = true)}
				><Settings size={17} /><span>Book settings</span></button
			>
			<details class="export-menu" bind:open={exportOpen}>
				<summary class="toolbar-button"
					><Download size={17} /><span>Export</span><ChevronDown size={14} /></summary
				>
				<div>
					<button
						type="button"
						disabled={model.exporting !== undefined}
						onclick={() => exportBook('pdf')}
						><FileText size={17} /><span
							><strong>PDF</strong><small>Typeset, ready to print</small></span
						></button
					>
					<button
						type="button"
						disabled={model.exporting !== undefined}
						onclick={() => exportBook('epub')}
						><Download size={17} /><span
							><strong>EPUB</strong><small>For e-readers and stores</small></span
						></button
					>
				</div>
			</details>
			<button
				class="account-icon"
				type="button"
				aria-label="Account and cloud storage"
				onclick={() => (model.accountOpen = true)}
				><UserRound size={18} />{#if model.isPremium}<i></i>{/if}</button
			>
		</div>
	</header>

	<div class="workspace-grid">
		<div class="sidebar" class:open={sidebarOpen}>
			<button
				class="sidebar-backdrop"
				type="button"
				aria-label="Close novel contents"
				onclick={() => (sidebarOpen = false)}
			></button>
			<div class="sidebar-inner">
				<WorkspaceSidebar {model} />
			</div>
		</div>
		<EditorPane {model} />
	</div>
</div>

{#if model.settingsOpen}
	<BookSettingsModal {model} />
{/if}

<style>
	.workspace-page {
		--topbar-height: calc(3.45rem + env(safe-area-inset-top));
		min-width: 0;
		min-height: 0;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		background: #e9e4db;
	}

	.topbar {
		display: flex;
		height: var(--topbar-height);
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: env(safe-area-inset-top) max(0.7rem, env(safe-area-inset-right)) 0
			max(0.7rem, env(safe-area-inset-left));
		background: var(--forest-deep);
		box-shadow: 0 1px 0 rgb(255 255 255 / 8%);
		color: white;
	}

	.topbar-left,
	.topbar-actions,
	.compact-status,
	.toolbar-button,
	.account-icon {
		display: flex;
		align-items: center;
	}

	.topbar-left {
		gap: 0.35rem;
	}

	.topbar-left .icon-button {
		color: #d9e2dd;
	}

	.topbar-left .icon-button:hover {
		color: white;
		background: rgb(255 255 255 / 9%);
	}

	.topbar-left strong {
		margin-left: 0.25rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.83rem;
	}

	.mobile-sidebar {
		display: none;
	}

	.topbar-actions {
		gap: 0.35rem;
	}

	.compact-status {
		gap: 0.35rem;
		margin-right: 0.45rem;
		color: #c5d3cd;
		font-size: 0.66rem;
	}

	.compact-status.warning {
		color: #f0c2a9;
	}

	.toolbar-button,
	.account-icon {
		min-height: 2.25rem;
		gap: 0.42rem;
		padding: 0.45rem 0.65rem;
		color: #e5ece8;
		background: transparent;
		border: 0;
		border-radius: 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		list-style: none;
		cursor: pointer;
	}

	.toolbar-button:hover,
	.account-icon:hover,
	.export-menu[open] > summary {
		color: white;
		background: rgb(255 255 255 / 10%);
	}

	.account-icon {
		position: relative;
		width: 2.25rem;
		justify-content: center;
		padding: 0;
		border: 1px solid rgb(255 255 255 / 20%);
		border-radius: 50%;
	}

	.account-icon i {
		position: absolute;
		right: -1px;
		bottom: 0;
		width: 0.55rem;
		height: 0.55rem;
		background: #df9a6f;
		border: 2px solid var(--forest-deep);
		border-radius: 50%;
	}

	.export-menu {
		position: relative;
	}

	.export-menu summary::-webkit-details-marker {
		display: none;
	}

	.export-menu > div {
		position: absolute;
		z-index: 20;
		top: 2.7rem;
		right: 0;
		width: 15rem;
		padding: 0.35rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: var(--shadow);
	}

	.export-menu div button {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.7rem;
		padding: 0.7rem;
		color: var(--ink);
		text-align: left;
		background: transparent;
		border: 0;
		border-radius: 0.5rem;
	}

	.export-menu div button:hover {
		background: var(--paper-deep);
	}

	.export-menu div span,
	.export-menu div strong,
	.export-menu div small {
		display: block;
	}

	.export-menu div small {
		margin-top: 0.12rem;
		color: var(--ink-soft);
		font-size: 0.65rem;
	}

	.workspace-grid {
		display: grid;
		min-width: 0;
		min-height: 0;
		height: calc(100vh - var(--topbar-height));
		height: calc(100dvh - var(--topbar-height));
		grid-template-columns: 17.5rem minmax(0, 1fr);
		padding-bottom: env(safe-area-inset-bottom);
		overflow: hidden;
	}

	.sidebar,
	.sidebar-inner {
		min-width: 0;
		height: 100%;
	}

	.sidebar-backdrop {
		display: none;
	}

	@media (max-width: 820px) {
		.mobile-sidebar {
			display: grid;
		}

		.compact-status,
		.toolbar-button span {
			display: none;
		}

		.toolbar-button {
			width: 2.25rem;
			justify-content: center;
			padding: 0;
		}

		.workspace-grid {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: fixed;
			z-index: 30;
			inset: var(--topbar-height) 0 env(safe-area-inset-bottom);
			visibility: hidden;
			background: transparent;
			opacity: 0;
			transition:
				opacity 160ms ease,
				visibility 160ms ease;
		}

		.sidebar-backdrop {
			position: absolute;
			inset: 0;
			display: block;
			padding: 0;
			background: rgb(19 28 24 / 45%);
			border: 0;
		}

		.sidebar.open {
			visibility: visible;
			opacity: 1;
		}

		.sidebar-inner {
			position: relative;
			width: min(18rem, 86vw);
			transform: translateX(-100%);
			transition: transform 180ms ease;
		}

		.sidebar.open .sidebar-inner {
			transform: translateX(0);
		}
	}
</style>
