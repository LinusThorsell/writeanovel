<script lang="ts">
	import { onMount } from 'svelte';
	import { Download, Share2 } from '@lucide/svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	type Props = {
		variant?: 'light' | 'dark';
	};

	let { variant = 'light' }: Props = $props();
	let installPrompt = $state<BeforeInstallPromptEvent>();
	let installed = $state(false);
	let mobileBrowser = $state(false);
	let appleMobile = $state(false);
	let instructionsOpen = $state(false);
	const installAvailable = $derived(!installed && (installPrompt !== undefined || mobileBrowser));

	function isStandalone(): boolean {
		return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
	}

	function captureInstallPrompt(event: Event): void {
		const promptEvent = event as BeforeInstallPromptEvent;
		promptEvent.preventDefault();
		installPrompt = promptEvent;
		installed = false;
	}

	async function installApplication(): Promise<void> {
		if (!installPrompt) {
			instructionsOpen = true;
			return;
		}

		const prompt = installPrompt;
		installPrompt = undefined;
		await prompt.prompt();
		const choice = await prompt.userChoice;
		if (choice.outcome === 'accepted') installed = true;
	}

	onMount(() => {
		installed = isStandalone();
		appleMobile =
			/iPad|iPhone|iPod/i.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		mobileBrowser =
			window.matchMedia('(max-width: 900px)').matches ||
			/Android|iPad|iPhone|iPod|Mobile/i.test(navigator.userAgent);
	});
</script>

<svelte:window onbeforeinstallprompt={captureInstallPrompt} />

{#if installAvailable}
	<button
		aria-label="Install application"
		class:dark={variant === 'dark'}
		class="install-button"
		title="Install application"
		type="button"
		onclick={installApplication}
	>
		<Download size={17} />
		<span>Install app</span>
	</button>
{/if}

{#if instructionsOpen}
	<Modal
		title="Install WriteANovel"
		description="Keep your writing studio on your home screen and open it like an app."
		onClose={() => (instructionsOpen = false)}
		width="small"
	>
		<div class="install-instructions">
			{#if appleMobile}
				<div><Share2 size={22} /></div>
				<p>
					In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.
				</p>
			{:else}
				<div><Download size={22} /></div>
				<p>
					Open your browser menu, then choose <strong>Install app</strong> or
					<strong>Add to Home screen</strong>.
				</p>
			{/if}
		</div>
	</Modal>
{/if}

<style>
	.install-button {
		display: inline-flex;
		min-height: 2.35rem;
		align-items: center;
		justify-content: center;
		gap: 0.42rem;
		padding: 0.45rem 0.7rem;
		color: var(--forest-deep);
		background: white;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 750;
	}

	.install-button.dark {
		color: #e5ece8;
		background: transparent;
		border-color: rgb(255 255 255 / 20%);
		border-radius: 0.5rem;
	}

	.install-button:hover {
		background: var(--paper-deep);
	}

	.install-button.dark:hover {
		color: white;
		background: rgb(255 255 255 / 10%);
	}

	.install-instructions {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.9rem;
	}

	.install-instructions > div {
		display: grid;
		width: 3rem;
		height: 3rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.8rem;
	}

	.install-instructions p {
		margin: 0;
		color: var(--ink-soft);
		line-height: 1.6;
	}

	@media (max-width: 820px) {
		.install-button {
			width: 2.35rem;
			padding: 0;
		}

		.install-button span {
			display: none;
		}
	}
</style>
