<script lang="ts">
	import { ArrowLeft, Check, MoveRight } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/components/marketing/SeoHead.svelte';
	import { marketingPageStructuredData } from '$lib/marketing/seo';
	import { getMarketingPage } from '$lib/marketing/site';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const content = $derived(data.content);
	const relatedPages = $derived(
		content.relatedSlugs.map((slug) => getMarketingPage(slug)).filter((page) => page !== undefined)
	);
</script>

<SeoHead
	title={content.title}
	description={content.description}
	path={`/${content.slug}`}
	structuredData={marketingPageStructuredData(content)}
/>

<nav class="breadcrumb" aria-label="Breadcrumb">
	<a href={resolve('/')}><ArrowLeft size={14} />Home</a>
	<span aria-hidden="true">/</span>
	<span>{content.eyebrow}</span>
</nav>

<header class="page-hero">
	<p class="eyebrow">{content.eyebrow}</p>
	<h1>{content.heading}</h1>
	<p>{content.introduction}</p>
	<div class="hero-actions">
		<a class="button button-primary" href={resolve('/app')}
			>Start writing free <MoveRight size={17} /></a
		>
		<a class="button button-secondary" href={resolve('/features')}>See all features</a>
	</div>
</header>

<aside class="highlight-strip" aria-label="Key capabilities">
	{#each content.highlights as highlight (highlight)}
		<span><Check size={15} />{highlight}</span>
	{/each}
</aside>

<div class="article-sections">
	{#each content.sections as section, index (section.heading)}
		<section class:alternate={index % 2 === 1}>
			<div class="section-number">0{index + 1}</div>
			<div class="section-copy">
				<p class="eyebrow">{section.eyebrow}</p>
				<h2>{section.heading}</h2>
				{#each section.paragraphs as paragraph (paragraph)}
					<p>{paragraph}</p>
				{/each}
			</div>
			{#if section.points}
				<div class="point-list">
					{#each section.points as point (point.title)}
						<article>
							<Check size={17} />
							<div>
								<h3>{point.title}</h3>
								<p>{point.text}</p>
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<div class="quote-mark" aria-hidden="true">“</div>
			{/if}
		</section>
	{/each}
</div>

<section class="faq-section">
	<div>
		<p class="eyebrow">Straight answers</p>
		<h2>Common questions</h2>
	</div>
	<div class="faq-list">
		{#each content.faq as item (item.question)}
			<article>
				<h3>{item.question}</h3>
				<p>{item.answer}</p>
			</article>
		{/each}
	</div>
</section>

<section class="related-section">
	<p class="eyebrow">Keep exploring</p>
	<h2>Build the rest of your writing workflow</h2>
	<div class="related-grid">
		{#each relatedPages as related (related.slug)}
			<a href={resolve(`/${related.slug}`)}>
				<span>{related.eyebrow}</span>
				<strong>{related.heading}</strong>
				<MoveRight size={17} />
			</a>
		{/each}
	</div>
</section>

<section class="article-cta">
	<div>
		<p class="eyebrow">Write locally today</p>
		<h2>Open a blank chapter, not a signup form.</h2>
	</div>
	<a class="button" href={resolve('/app')}>Start your novel <MoveRight size={17} /></a>
</section>

<style>
	.breadcrumb,
	.page-hero,
	.highlight-strip,
	.article-sections,
	.faq-section,
	.related-section,
	.article-cta {
		width: min(68rem, calc(100% - 2rem));
		margin-inline: auto;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding-top: 3rem;
		color: #7a877f;
		font-size: 0.7rem;
	}

	.breadcrumb a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--forest);
		font-weight: 750;
		text-decoration: none;
	}

	.page-hero {
		max-width: 58rem;
		padding: 6rem 0 4rem;
		text-align: center;
	}

	.page-hero h1,
	.article-sections h2,
	.faq-section h2,
	.related-section h2,
	.article-cta h2 {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
		letter-spacing: -0.04em;
	}

	.page-hero h1 {
		margin: 0.8rem 0 1.4rem;
		font-size: clamp(2.7rem, 6vw, 5rem);
		line-height: 1.05;
	}

	.page-hero > p:not(.eyebrow) {
		max-width: 48rem;
		margin: 0 auto;
		color: var(--ink-soft);
		font-size: 1.05rem;
		line-height: 1.75;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.7rem;
		margin-top: 2rem;
	}

	.highlight-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		background: var(--forest-deep);
		border-radius: 0.9rem;
		box-shadow: var(--shadow);
		color: #dbe5e0;
	}

	.highlight-strip span {
		display: flex;
		min-height: 5.5rem;
		align-items: center;
		gap: 0.55rem;
		padding: 1.2rem;
		border-right: 1px solid rgb(255 255 255 / 10%);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.highlight-strip span:last-child {
		border-right: 0;
	}

	.highlight-strip :global(svg) {
		flex: 0 0 auto;
		color: #e8ab85;
	}

	.article-sections {
		padding-top: 7rem;
	}

	.article-sections > section {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1.2fr) minmax(16rem, 0.8fr);
		gap: clamp(1.5rem, 5vw, 4.5rem);
		align-items: start;
		padding: 5rem 0;
		border-bottom: 1px solid var(--line);
	}

	.article-sections > section:first-child {
		padding-top: 0;
	}

	.article-sections > section.alternate .section-copy {
		grid-column: 3;
		grid-row: 1;
	}

	.article-sections > section.alternate .point-list,
	.article-sections > section.alternate .quote-mark {
		grid-column: 2;
		grid-row: 1;
	}

	.section-number {
		padding-top: 0.35rem;
		color: #a7a095;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.8rem;
	}

	.article-sections h2 {
		margin: 0.65rem 0 1.25rem;
		font-size: clamp(1.8rem, 3.3vw, 2.75rem);
		line-height: 1.18;
	}

	.section-copy > p:not(.eyebrow) {
		color: var(--ink-soft);
		line-height: 1.8;
	}

	.point-list {
		display: grid;
		gap: 0.65rem;
	}

	.point-list article {
		display: flex;
		gap: 0.75rem;
		padding: 1.1rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
	}

	.point-list article > :global(svg) {
		flex: 0 0 auto;
		margin-top: 0.12rem;
		color: var(--forest);
	}

	.point-list h3,
	.faq-list h3 {
		margin: 0;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.9rem;
		font-weight: 400;
	}

	.point-list p,
	.faq-list p {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.72rem;
		line-height: 1.6;
	}

	.quote-mark {
		color: #d7cfc2;
		font-family: 'Libre Baskerville', serif;
		font-size: 9rem;
		line-height: 0.7;
		text-align: center;
	}

	.faq-section {
		display: grid;
		grid-template-columns: 0.75fr 1.25fr;
		gap: clamp(2rem, 8vw, 7rem);
		padding: 7rem 0;
	}

	.faq-section h2,
	.related-section h2 {
		margin: 0.6rem 0;
		font-size: clamp(1.8rem, 3vw, 2.6rem);
	}

	.faq-list {
		display: grid;
		gap: 1rem;
	}

	.faq-list article {
		padding-bottom: 1.2rem;
		border-bottom: 1px solid var(--line);
	}

	.related-section {
		padding: 4rem 0;
		border-top: 1px solid var(--line);
	}

	.related-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8rem;
		margin-top: 2rem;
	}

	.related-grid a {
		display: grid;
		min-height: 12rem;
		grid-template-columns: 1fr auto;
		align-content: space-between;
		gap: 0.7rem;
		padding: 1.4rem;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: transform 140ms ease;
	}

	.related-grid a:hover {
		transform: translateY(-2px);
	}

	.related-grid span {
		grid-column: 1 / -1;
		color: var(--copper);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.related-grid strong {
		font-family: 'Libre Baskerville', serif;
		font-size: 0.95rem;
		font-weight: 400;
		line-height: 1.45;
	}

	.related-grid :global(svg) {
		align-self: end;
		color: var(--forest);
	}

	.article-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 4rem;
		padding: 3rem;
		color: white;
		background: var(--forest);
		border-radius: 1rem;
	}

	.article-cta .eyebrow {
		color: #efb18b;
	}

	.article-cta h2 {
		max-width: 38rem;
		margin: 0.5rem 0 0;
		font-size: clamp(1.7rem, 3.5vw, 2.7rem);
	}

	.article-cta .button {
		flex: 0 0 auto;
		color: var(--forest-deep);
		background: #f7dfce;
	}

	@media (max-width: 840px) {
		.highlight-strip {
			grid-template-columns: repeat(2, 1fr);
		}

		.highlight-strip span:nth-child(2) {
			border-right: 0;
		}

		.highlight-strip span:nth-child(-n + 2) {
			border-bottom: 1px solid rgb(255 255 255 / 10%);
		}

		.article-sections > section,
		.article-sections > section.alternate {
			grid-template-columns: 2rem 1fr;
		}

		.article-sections > section .section-copy,
		.article-sections > section.alternate .section-copy {
			grid-column: 2;
			grid-row: auto;
		}

		.article-sections > section .point-list,
		.article-sections > section .quote-mark,
		.article-sections > section.alternate .point-list,
		.article-sections > section.alternate .quote-mark {
			grid-column: 2;
			grid-row: auto;
		}

		.faq-section {
			grid-template-columns: 1fr;
		}

		.related-grid {
			grid-template-columns: 1fr;
		}

		.related-grid a {
			min-height: 9rem;
		}
	}

	@media (max-width: 600px) {
		.breadcrumb,
		.page-hero,
		.highlight-strip,
		.article-sections,
		.faq-section,
		.related-section,
		.article-cta {
			width: min(100% - 1.25rem, 68rem);
		}

		.page-hero {
			padding-top: 4rem;
		}

		.highlight-strip {
			grid-template-columns: 1fr;
		}

		.highlight-strip span,
		.highlight-strip span:nth-child(2) {
			border-right: 0;
			border-bottom: 1px solid rgb(255 255 255 / 10%);
		}

		.highlight-strip span:last-child {
			border-bottom: 0;
		}

		.article-sections > section,
		.article-sections > section.alternate {
			grid-template-columns: 1fr;
		}

		.section-number,
		.article-sections > section .section-copy,
		.article-sections > section.alternate .section-copy,
		.article-sections > section .point-list,
		.article-sections > section .quote-mark,
		.article-sections > section.alternate .point-list,
		.article-sections > section.alternate .quote-mark {
			grid-column: 1;
		}

		.quote-mark {
			display: none;
		}

		.article-cta {
			align-items: flex-start;
			flex-direction: column;
			padding: 2rem;
		}
	}
</style>
