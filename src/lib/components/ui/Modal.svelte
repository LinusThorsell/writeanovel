<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		onClose: () => void;
		children: Snippet;
		footer?: Snippet;
		width?: 'small' | 'medium' | 'large';
	};

	let { title, description, onClose, children, footer, width = 'medium' }: Props = $props();

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop">
	<button class="backdrop-close" type="button" aria-label="Close dialog" onclick={onClose}></button>
	<div
		class="modal"
		class:small={width === 'small'}
		class:large={width === 'large'}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<header>
			<div>
				<h2 id="modal-title">{title}</h2>
				{#if description}<p>{description}</p>{/if}
			</div>
			<button class="icon-button" type="button" aria-label="Close" onclick={onClose}
				><X size={20} /></button
			>
		</header>
		<div class="content">{@render children()}</div>
		{#if footer}<footer>{@render footer()}</footer>{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		z-index: 50;
		inset: 0;
		display: grid;
		height: 100vh;
		height: 100dvh;
		place-items: center;
		padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
			max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
		background: rgb(20 30 26 / 58%);
		backdrop-filter: blur(5px);
	}

	.backdrop-close {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		padding: 0;
		background: transparent;
		border: 0;
	}

	.modal {
		position: relative;
		width: min(36rem, 100%);
		max-height: 100%;
		overflow: auto;
		background: var(--paper);
		border: 1px solid rgb(255 255 255 / 45%);
		border-radius: 1rem;
		box-shadow: 0 28px 90px rgb(9 19 15 / 35%);
	}

	.modal.small {
		width: min(28rem, 100%);
	}

	.modal.large {
		width: min(54rem, 100%);
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.4rem 1.4rem 1rem;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.35rem;
	}

	header p {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.content {
		padding: 1.4rem;
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.7rem;
		padding: 1rem 1.4rem 1.4rem;
		border-top: 1px solid var(--line);
	}
</style>
