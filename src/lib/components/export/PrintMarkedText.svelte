<script lang="ts">
	import type { RichTextMark } from '$lib/domain/types';
	import Self from './PrintMarkedText.svelte';

	type Props = {
		text: string;
		marks: RichTextMark[];
		index?: number;
	};

	let { text, marks, index = 0 }: Props = $props();
	const mark = $derived(marks[index]);
</script>

{#if !mark}
	{text}
{:else if mark.type === 'bold'}
	<strong><Self {text} {marks} index={index + 1} /></strong>
{:else if mark.type === 'italic'}
	<em><Self {text} {marks} index={index + 1} /></em>
{:else if mark.type === 'underline'}
	<u><Self {text} {marks} index={index + 1} /></u>
{:else if mark.type === 'strike'}
	<s><Self {text} {marks} index={index + 1} /></s>
{:else if mark.type === 'code'}
	<code><Self {text} {marks} index={index + 1} /></code>
{:else if mark.type === 'link'}
	<span class="print-link"><Self {text} {marks} index={index + 1} /></span>
{:else}
	<Self {text} {marks} index={index + 1} />
{/if}

<style>
	.print-link {
		text-decoration: underline;
	}
</style>
