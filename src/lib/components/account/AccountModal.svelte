<script lang="ts">
	import { Check, Cloud, HardDrive, LogOut, Mail, UserRound } from '@lucide/svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let { model }: { model: WriteANovelState } = $props();
	let mode = $state<'login' | 'register' | 'forgot'>('login');
	let email = $state('');
	let password = $state('');
	let displayName = $state('');
	let formError = $state<string>();

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		formError = undefined;
		try {
			if (mode === 'login') await model.login(email, password);
			if (mode === 'register') await model.register(email, password, displayName);
			if (mode === 'forgot') await model.requestPasswordReset(email);
		} catch {
			formError = 'That did not work. Please check your details and try again.';
		}
	}
</script>

<Modal
	title="Your account"
	description={model.user ? undefined : 'You can write for free without an account'}
	onClose={() => (model.accountOpen = false)}
>
	{#if model.user}
		<div class="account-card">
			<div class="avatar"><UserRound size={24} /></div>
			<div>
				<strong>{model.user.displayName || 'Writer'}</strong>
				<span>{model.user.email}</span>
			</div>
			<div class:premium={model.isPremium} class="plan-badge">
				{model.isPremium ? 'Backed up' : 'On this device'}
			</div>
		</div>

		{#if model.isPremium}
			<div class="storage-card premium-storage">
				<div class="storage-icon"><Cloud size={22} /></div>
				<div>
					<strong>Your novels are backed up</strong>
				</div>
				<Check size={20} />
			</div>
		{:else}
			<div class="storage-card">
				<div class="storage-icon local"><HardDrive size={22} /></div>
				<div>
					<strong>Saved on this device</strong>
					<p>Only this device can see these novels unless you choose to back them up.</p>
				</div>
			</div>
		{/if}

		{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
		<button class="sign-out" type="button" onclick={() => model.logout()}
			><LogOut size={16} />Sign out</button
		>
	{:else}
		{#if mode !== 'forgot'}
			<div class="tabs" role="tablist" aria-label="Account action">
				<button
					class:active={mode === 'login'}
					type="button"
					role="tab"
					aria-selected={mode === 'login'}
					onclick={() => (mode = 'login')}>Sign in</button
				>
				<button
					class:active={mode === 'register'}
					type="button"
					role="tab"
					aria-selected={mode === 'register'}
					onclick={() => (mode = 'register')}>Create account</button
				>
			</div>
		{/if}

		<form onsubmit={submit}>
			{#if mode === 'register'}
				<label class="field"
					><span>Your name</span><input
						bind:value={displayName}
						autocomplete="name"
						required
					/></label
				>
			{/if}
			<label class="field"
				><span>Email</span><input
					type="email"
					bind:value={email}
					autocomplete="email"
					required
				/></label
			>
			{#if mode !== 'forgot'}
				<label class="field"
					><span>Password</span><input
						type="password"
						bind:value={password}
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
						minlength="8"
						required
					/></label
				>
			{/if}

			{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
			<button class="button button-primary submit" type="submit" disabled={model.working}>
				{#if mode === 'forgot'}<Mail size={17} />Send reset link{:else if mode === 'register'}Create
					account{:else}Sign in{/if}
			</button>
		</form>

		{#if mode === 'login'}
			<button class="text-action" type="button" onclick={() => (mode = 'forgot')}
				>Forgot your password?</button
			>
		{:else if mode === 'forgot'}
			<button class="text-action" type="button" onclick={() => (mode = 'login')}
				>Back to sign in</button
			>
		{/if}

		<div class="free-reminder">
			<HardDrive size={18} /><span
				><strong>No account needed for free writing.</strong> Close this window and everything stays on
				this device.</span
			>
		</div>
	{/if}
</Modal>

<style>
	.account-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 1.2rem;
		border-bottom: 1px solid var(--line);
	}

	.avatar,
	.storage-icon {
		display: grid;
		width: 2.8rem;
		height: 2.8rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 50%;
	}

	.account-card strong,
	.account-card span {
		display: block;
	}

	.account-card span {
		margin-top: 0.15rem;
		color: var(--ink-soft);
		font-size: 0.78rem;
	}

	.plan-badge {
		padding: 0.3rem 0.6rem;
		color: var(--ink-soft);
		background: var(--paper-deep);
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 800;
	}

	.plan-badge.premium {
		color: #754027;
		background: #f5dac8;
	}

	.storage-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.85rem;
		margin-top: 1.2rem;
		padding: 1rem;
		background: #f1ede5;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
	}

	.premium-storage {
		background: #edf3ef;
		border-color: #c8d9d0;
	}

	.storage-icon {
		width: 2.5rem;
		height: 2.5rem;
	}

	.storage-icon.local {
		color: var(--ink-soft);
		background: white;
		border: 1px solid var(--line);
	}

	.storage-card strong,
	.storage-card p {
		margin: 0;
	}

	.storage-card p {
		margin-top: 0.2rem;
		color: var(--ink-soft);
		font-size: 0.75rem;
		line-height: 1.45;
	}

	.sign-out,
	.text-action {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 1rem auto 0;
		padding: 0.35rem;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		font-size: 0.78rem;
	}

	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.3rem;
		padding: 0.25rem;
		background: var(--paper-deep);
		border-radius: 0.65rem;
	}

	.tabs button {
		padding: 0.55rem;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.48rem;
		font-size: 0.8rem;
		font-weight: 750;
	}

	.tabs button.active {
		color: var(--ink);
		background: white;
		box-shadow: 0 2px 8px rgb(30 42 36 / 8%);
	}

	form {
		display: grid;
		gap: 0.9rem;
		margin-top: 1.2rem;
	}

	.submit {
		width: 100%;
		margin-top: 0.2rem;
	}

	.form-error {
		margin: 0.25rem 0;
		padding: 0.7rem;
		color: #7e2f29;
		background: #f8e6e3;
		border-radius: 0.5rem;
		font-size: 0.75rem;
	}

	.free-reminder {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		margin-top: 1.2rem;
		padding-top: 1rem;
		color: var(--ink-soft);
		border-top: 1px solid var(--line);
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.free-reminder :global(svg) {
		flex: 0 0 auto;
	}
</style>
