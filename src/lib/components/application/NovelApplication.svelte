<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, CheckCircle2, X } from '@lucide/svelte';
	import { monitorServiceWorkerUpdates } from '$lib/application/service-worker-updates';
	import { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import AccountModal from '$lib/components/account/AccountModal.svelte';
	import ProjectLibrary from '$lib/components/library/ProjectLibrary.svelte';
	import WorkspaceShell from '$lib/components/workspace/WorkspaceShell.svelte';

	const state = new WriteANovelState();

	onMount(() => {
		const stopMonitoringServiceWorker = monitorServiceWorkerUpdates();

		state.initialize().catch((error) => {
			state.loading = false;
			state.showError(error instanceof Error ? error.message : 'WriteANovel could not start.');
		});

		return stopMonitoringServiceWorker;
	});
</script>

{#if state.workspace}
	<WorkspaceShell model={state} />
{:else}
	<ProjectLibrary model={state} />
{/if}

{#if state.accountOpen}
	<AccountModal model={state} />
{/if}

{#if state.notice || state.error}
	<div
		class:error={state.error !== undefined}
		class="toast"
		role={state.error ? 'alert' : 'status'}
	>
		{#if state.error}<AlertCircle size={19} />{:else}<CheckCircle2 size={19} />{/if}
		<span>{state.error ?? state.notice}</span>
		<button type="button" aria-label="Dismiss message" onclick={() => state.clearMessages()}
			><X size={16} /></button
		>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		z-index: 80;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		display: grid;
		max-width: min(28rem, calc(100vw - 2rem));
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.65rem;
		padding: 0.8rem 0.85rem;
		color: white;
		background: var(--forest-deep);
		border: 1px solid rgb(255 255 255 / 14%);
		border-radius: 0.7rem;
		box-shadow: 0 12px 40px rgb(14 24 20 / 32%);
		font-size: 0.78rem;
		pointer-events: none;
	}

	.toast.error {
		background: #7f332d;
	}

	.toast button {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		padding: 0;
		color: inherit;
		background: transparent;
		border: 0;
		border-radius: 0.35rem;
		pointer-events: auto;
	}

	.toast button:hover {
		background: rgb(255 255 255 / 12%);
	}
</style>
