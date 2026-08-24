<script lang="ts">
	import type { JsonValue, RichTextNode, TrimSize } from '$lib/domain/types';
	import { printableImageWidth } from '$lib/export/print-layout';
	import PrintMarkedText from './PrintMarkedText.svelte';
	import Self from './PrintRichText.svelte';

	type Props = {
		node: RichTextNode;
		assetUrls: ReadonlyMap<string, string>;
		trimSize: TrimSize;
	};

	let { node, assetUrls, trimSize }: Props = $props();

	function stringAttribute(value: JsonValue | undefined): string | undefined {
		return typeof value === 'string' ? value : undefined;
	}

	function numberAttribute(value: JsonValue | undefined): number | undefined {
		return typeof value === 'number' ? value : undefined;
	}

	function alignment(): 'left' | 'center' | 'right' | undefined {
		const value = stringAttribute(node.attrs?.textAlign);
		return value === 'left' || value === 'center' || value === 'right' ? value : undefined;
	}
</script>

{#snippet children()}
	{#each node.content ?? [] as child, index (`${child.type ?? 'node'}-${index}`)}
		<Self node={child} {assetUrls} {trimSize} />
	{/each}
{/snippet}

{#if node.type === 'text'}
	<PrintMarkedText text={node.text ?? ''} marks={node.marks ?? []} />
{:else if node.type === 'paragraph'}
	<p style:text-align={alignment()}>
		{#if node.content?.length}{@render children()}{:else}&nbsp;{/if}
	</p>
{:else if node.type === 'heading'}
	{@const level = Math.min(3, Math.max(1, numberAttribute(node.attrs?.level) ?? 2))}
	{#if level === 1}
		<h1 style:text-align={alignment()}>{@render children()}</h1>
	{:else if level === 2}
		<h2 style:text-align={alignment()}>{@render children()}</h2>
	{:else}
		<h3 style:text-align={alignment()}>{@render children()}</h3>
	{/if}
{:else if node.type === 'blockquote'}
	<blockquote>{@render children()}</blockquote>
{:else if node.type === 'bulletList'}
	<ul>{@render children()}</ul>
{:else if node.type === 'orderedList'}
	<ol>{@render children()}</ol>
{:else if node.type === 'listItem'}
	<li>{@render children()}</li>
{:else if node.type === 'hardBreak'}
	<br />
{:else if node.type === 'horizontalRule'}
	<hr />
{:else if node.type === 'image'}
	{@const assetId = stringAttribute(node.attrs?.assetId)}
	{@const width = numberAttribute(node.attrs?.width)}
	{@const imageAlignment = stringAttribute(node.attrs?.alignment) ?? 'center'}
	{#if assetId && assetUrls.get(assetId)}
		<figure class={['media', `media-${imageAlignment}`]}>
			<img
				src={assetUrls.get(assetId)}
				alt={stringAttribute(node.attrs?.alt) ?? ''}
				style:width={width ? printableImageWidth(width, trimSize) : undefined}
			/>
		</figure>
	{/if}
{:else}
	{@render children()}
{/if}
