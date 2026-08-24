<script lang="ts">
	import { CheckCircle2, KeyRound } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { accountService } from '$lib/application/services';

	const token = page.url.searchParams.get('token') ?? '';
	let password = $state('');
	let confirmation = $state('');
	let working = $state(false);
	let complete = $state(false);
	let error = $state<string>();

	async function resetPassword(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		error = undefined;
		if (!token) {
			error = 'This reset link is missing its security token.';
			return;
		}
		if (password !== confirmation) {
			error = 'The two passwords do not match.';
			return;
		}

		working = true;
		try {
			await accountService.confirmPasswordReset(token, password);
			complete = true;
		} catch (requestError) {
			error =
				requestError instanceof Error ? requestError.message : 'The password could not be reset.';
		} finally {
			working = false;
		}
	}
</script>

<svelte:head>
	<title>Reset password | WriteANovel</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

<main>
	<section>
		<div class="mark">
			{#if complete}<CheckCircle2 size={28} />{:else}<KeyRound size={28} />{/if}
		</div>
		{#if complete}
			<h1>Password changed</h1>
			<p>Your new password is ready. You can return to WriteANovel and sign in.</p>
			<a class="button button-primary" href={resolve('/app')}>Return to the writing studio</a>
		{:else}
			<p class="eyebrow">WriteANovel account</p>
			<h1>Choose a new password</h1>
			<p>
				Use at least eight characters. A longer phrase is easier to remember and harder to guess.
			</p>
			<form onsubmit={resetPassword}>
				<label class="field"
					><span>New password</span><input
						type="password"
						bind:value={password}
						minlength="8"
						autocomplete="new-password"
						required
					/></label
				>
				<label class="field"
					><span>Repeat password</span><input
						type="password"
						bind:value={confirmation}
						minlength="8"
						autocomplete="new-password"
						required
					/></label
				>
				{#if error}<p class="error" role="alert">{error}</p>{/if}
				<button class="button button-primary" type="submit" disabled={working}
					>{working ? 'Changing password…' : 'Change password'}</button
				>
			</form>
		{/if}
	</section>
</main>

<style>
	main {
		display: grid;
		min-height: 100vh;
		place-items: center;
		padding: 1rem;
	}

	section {
		width: min(28rem, 100%);
		padding: 2rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 1rem;
		box-shadow: var(--shadow);
	}

	.mark {
		display: grid;
		width: 3.5rem;
		height: 3.5rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.9rem;
	}

	h1 {
		margin: 1rem 0 0.5rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.65rem;
	}

	section > p:not(.eyebrow) {
		color: var(--ink-soft);
		line-height: 1.55;
	}

	form {
		display: grid;
		gap: 1rem;
		margin-top: 1.4rem;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.78rem;
	}

	a.button {
		margin-top: 0.7rem;
	}
</style>
