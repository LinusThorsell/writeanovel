<script lang="ts">
	import {
		BookOpenText,
		Check,
		Download,
		Feather,
		FileStack,
		HardDrive,
		Image,
		Map,
		MoveRight,
		ShieldCheck,
		Sparkles,
		UsersRound
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/components/marketing/SeoHead.svelte';
	import { homeStructuredData } from '$lib/marketing/seo';

	const title = 'WriteANovel — Offline Novel Writing Software & Book Editor';
	const description =
		'Plan, write, and format complete novels in a private writing studio that works without internet. Organize chapters and notes, then export PDF and EPUB.';
	const workflow = [
		{
			step: '01',
			title: 'Plan the story',
			text: 'Keep characters, environments, plotlines, and research beside the manuscript.',
			icon: Map
		},
		{
			step: '02',
			title: 'Write in chapters',
			text: 'Insert chapters anywhere and let their visible numbering update automatically.',
			icon: Feather
		},
		{
			step: '03',
			title: 'Shape the book',
			text: 'Choose the book size and reading style, add pages and covers, then place artwork.',
			icon: BookOpenText
		},
		{
			step: '04',
			title: 'Export and share',
			text: 'Download a PDF for sharing or printing and an EPUB for reading apps.',
			icon: Download
		}
	] as const;
	const featureLinks = [
		{
			eyebrow: 'Private-first writing',
			title: 'Your writing stays on your device',
			text: 'Start without an account. Your novels are saved automatically and stay private.',
			href: '/offline-novel-writing',
			link: 'How your writing stays safe',
			icon: HardDrive
		},
		{
			eyebrow: 'Story notes',
			title: 'Plan without leaving the draft',
			text: 'Give chapters, characters, environments, plotlines, and general notes clear places inside every novel.',
			href: '/novel-planning',
			link: 'Explore novel planning',
			icon: UsersRound
		},
		{
			eyebrow: 'Book-aware editing',
			title: 'Book formatting made simple',
			text: 'Choose a book size and reading style, add covers, and place or resize images.',
			href: '/book-typesetting',
			link: 'See book design and export',
			icon: Sparkles
		}
	] as const;
</script>

<SeoHead {title} {description} path="/" structuredData={homeStructuredData(description)} />

<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow">Private novel writing</p>
		<h1>Write the novel. <em>Shape the book.</em></h1>
		<p class="hero-intro">
			A calm writing studio for planning stories, drafting chapters, creating book pages, and
			exporting a finished PDF or EPUB—even without internet.
		</p>
		<div class="hero-actions">
			<a class="button button-primary" href={resolve('/app')}
				>Start writing <MoveRight size={17} /></a
			>
			<a class="button button-secondary" href={resolve('/features')}>Explore every feature</a>
		</div>
		<ul class="hero-promises">
			<li><Check size={15} />No account required</li>
			<li><Check size={15} />Works offline</li>
			<li><Check size={15} />Your writing stays private</li>
		</ul>
	</div>

	<div class="studio-preview" aria-label="Preview of the WriteANovel writing studio">
		<div class="preview-bar">
			<span></span><span></span><span></span>
			<strong>THE GLASS HARBOR</strong>
			<small>Saved locally</small>
		</div>
		<div class="preview-body">
			<aside>
				<p>MANUSCRIPT</p>
				<div><span>1</span> The Cartographer</div>
				<div class="active"><span>2</span> Harbor Bells</div>
				<div><span>3</span> A Map of Ash</div>
				<p>STORY</p>
				<div><UsersRound size={13} /> Characters</div>
				<div><Map size={13} /> Environments</div>
			</aside>
			<article>
				<div class="preview-tools"><b>B</b><i>I</i><span>¶</span><span>☰</span></div>
				<small>CHAPTER TWO</small>
				<h2>Harbor Bells</h2>
				<p>
					The bells sounded before dawn, carrying across the black water and into every room along
					the quay.
				</p>
				<p>Mara folded the map before the final note disappeared.</p>
			</article>
		</div>
		<div class="preview-shadow"></div>
	</div>
</section>

<section class="confidence" aria-label="WriteANovel capabilities">
	<div>
		<HardDrive size={21} /><span><strong>Local by default</strong>Your writing stays private</span>
	</div>
	<div>
		<FileStack size={21} /><span><strong>Book structure</strong>Chapters renumber themselves</span>
	</div>
	<div>
		<Image size={21} /><span><strong>Images</strong>Place and resize artwork</span>
	</div>
	<div>
		<ShieldCheck size={21} /><span><strong>Safe by design</strong>Your writing stays yours</span>
	</div>
</section>

<section class="section workflow-section">
	<div class="section-heading">
		<p class="eyebrow">One continuous workflow</p>
		<h2>From scattered idea to finished book</h2>
		<p>
			WriteANovel connects the stages that usually make a writer move between unrelated apps. The
			manuscript remains the center of the work from first outline through final export.
		</p>
	</div>
	<div class="workflow-grid">
		{#each workflow as item (item.step)}
			<article>
				<div class="workflow-icon"><item.icon size={22} /></div>
				<span>{item.step}</span>
				<h3>{item.title}</h3>
				<p>{item.text}</p>
			</article>
		{/each}
	</div>
</section>

<section class="privacy-section">
	<div class="privacy-copy">
		<p class="eyebrow">A private offline novel editor</p>
		<h2>Your writing stays local and safe.</h2>
		<p>
			WriteANovel saves your novels on this device as you work. You can begin without an account,
			and your writing stays private.
		</p>
		<p>
			Keep writing without an internet connection, and download a copy whenever you want an extra
			backup.
		</p>
		<a href={resolve('/offline-novel-writing')}
			>Learn how your writing stays safe <MoveRight size={16} /></a
		>
	</div>
	<div class="privacy-card">
		<div class="privacy-orbit"><HardDrive size={32} /></div>
		<h3>Local and safe</h3>
		<ul>
			<li><Check size={16} />No account required</li>
			<li><Check size={16} />Saved automatically on this device</li>
			<li><Check size={16} />Works without internet</li>
			<li><Check size={16} />Download a copy whenever you like</li>
		</ul>
		<div class="cloud-note"><ShieldCheck size={17} />Your writing stays private by default.</div>
	</div>
</section>

<section class="section feature-section">
	<div class="section-heading">
		<p class="eyebrow">Purpose-built for long fiction</p>
		<h2>More than a blank text box</h2>
		<p>
			A novel writing app with a chapter planner should help with structure and production while
			staying understandable to someone who has never configured a writing tool.
		</p>
	</div>
	<div class="feature-grid">
		{#each featureLinks as feature (feature.href)}
			<article>
				<div class="feature-icon"><feature.icon size={23} /></div>
				<p class="eyebrow">{feature.eyebrow}</p>
				<h3>{feature.title}</h3>
				<p>{feature.text}</p>
				<a href={resolve(feature.href)}>{feature.link} <MoveRight size={15} /></a>
			</article>
		{/each}
	</div>
</section>

<section class="typeset-section">
	<div class="typeset-sample">
		<div class="book-page">
			<span>CHAPTER SEVEN</span>
			<h3>The Shape of Returning</h3>
			<p class="drop-cap">
				Every road into the valley looked different after winter. The stone markers remained, but
				the names had softened beneath rain and lichen.
			</p>
			<p>Elian read them anyway, remembering what the map refused to show.</p>
			<small>— 127 —</small>
		</div>
	</div>
	<div class="typeset-copy">
		<p class="eyebrow">Book design made visible</p>
		<h2>Write visually. Export like a book.</h2>
		<p>
			Choose the finished page size and reading style, then see how headings and paragraphs will
			look while you write.
		</p>
		<ul>
			<li><Check size={17} />Opening and closing book pages</li>
			<li><Check size={17} />Covers and images you can place and resize</li>
			<li><Check size={17} />PDF for sharing or printing</li>
			<li><Check size={17} />EPUB for reading apps and book stores</li>
		</ul>
		<a class="button button-secondary" href={resolve('/book-typesetting')}>Explore book design</a>
	</div>
</section>

<section class="section faq-section">
	<div class="section-heading compact">
		<p class="eyebrow">Questions writers ask</p>
		<h2>Start with the story, not setup</h2>
	</div>
	<div class="faq-grid">
		<article>
			<h3>Do I need an account to start?</h3>
			<p>No. Open the studio and begin writing. Your novels are saved on this device.</p>
		</article>
		<article>
			<h3>Will it work without internet?</h3>
			<p>Yes. Open WriteANovel once while connected, then keep writing without internet.</p>
		</article>
		<article>
			<h3>Can I write more than one novel?</h3>
			<p>Yes. Every project has its own manuscript, book settings, notes, and media library.</p>
		</article>
		<article>
			<h3>Do I need to understand book formatting?</h3>
			<p>No. Choose the look you want and see the result while you write.</p>
		</article>
	</div>
</section>

<section class="closing-cta">
	<div>
		<p class="eyebrow">The blank page is ready</p>
		<h2>Start the novel you keep meaning to write.</h2>
		<p>No account. No setup maze. Just a first chapter waiting on this device.</p>
	</div>
	<a class="button" href={resolve('/app')}>Open WriteANovel <MoveRight size={17} /></a>
</section>

<style>
	.hero,
	.section,
	.confidence,
	.privacy-section,
	.typeset-section,
	.closing-cta {
		width: min(72rem, calc(100% - 2rem));
		margin-inline: auto;
	}

	.hero {
		display: grid;
		min-height: 42rem;
		grid-template-columns: minmax(0, 0.92fr) minmax(28rem, 1.08fr);
		align-items: center;
		gap: clamp(2.5rem, 6vw, 6rem);
		padding: 5rem 0 6rem;
	}

	.hero-copy h1,
	.section-heading h2,
	.privacy-copy h2,
	.typeset-copy h2,
	.closing-cta h2 {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
		letter-spacing: -0.045em;
	}

	.hero-copy h1 {
		margin: 0.8rem 0 1.35rem;
		font-size: clamp(3rem, 6vw, 5.6rem);
		line-height: 0.99;
	}

	.hero-copy h1 em {
		display: block;
		color: var(--copper);
		font-weight: 400;
	}

	.hero-intro {
		max-width: 38rem;
		margin: 0;
		color: var(--ink-soft);
		font-size: clamp(1rem, 1.5vw, 1.16rem);
		line-height: 1.7;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		margin-top: 2rem;
	}

	.hero-promises {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem 1.2rem;
		padding: 0;
		margin: 1.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.72rem;
		list-style: none;
	}

	.hero-promises li,
	.typeset-copy li,
	.privacy-card li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.hero-promises :global(svg),
	.typeset-copy li :global(svg),
	.privacy-card li :global(svg) {
		color: var(--forest);
	}

	.studio-preview {
		position: relative;
		z-index: 0;
		min-height: 31rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 1.1rem;
		box-shadow: 0 28px 80px rgb(30 56 47 / 18%);
		transform: rotate(1.2deg);
	}

	.preview-shadow {
		position: absolute;
		z-index: -1;
		right: -1rem;
		bottom: -1.2rem;
		width: 75%;
		height: 70%;
		background: #c68461;
		border-radius: 1rem;
		opacity: 0.35;
	}

	.preview-bar {
		display: grid;
		height: 3.1rem;
		grid-template-columns: repeat(3, 0.55rem) 1fr auto;
		align-items: center;
		gap: 0.35rem;
		padding: 0 1rem;
		color: #dce7e1;
		background: var(--forest-deep);
		border-radius: 1rem 1rem 0 0;
	}

	.preview-bar > span {
		width: 0.55rem;
		height: 0.55rem;
		background: #6f8b7d;
		border-radius: 50%;
	}

	.preview-bar strong {
		justify-self: center;
		font-size: 0.58rem;
		letter-spacing: 0.12em;
	}

	.preview-bar small {
		color: #a9bdb3;
		font-size: 0.58rem;
	}

	.preview-body {
		display: grid;
		min-height: 28rem;
		grid-template-columns: 10rem 1fr;
	}

	.preview-body aside {
		padding: 1.4rem 0.8rem;
		background: #eee8dc;
		border-radius: 0 0 0 1rem;
	}

	.preview-body aside p {
		margin: 0.7rem 0.4rem;
		color: #78877f;
		font-size: 0.51rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.preview-body aside div {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem;
		color: #68766f;
		border-radius: 0.4rem;
		font-size: 0.58rem;
	}

	.preview-body aside div.active {
		color: var(--forest-deep);
		background: white;
		box-shadow: 0 4px 14px rgb(38 54 47 / 8%);
	}

	.preview-body aside div span {
		display: grid;
		width: 1rem;
		height: 1rem;
		place-items: center;
		color: white;
		background: var(--forest);
		border-radius: 0.2rem;
		font-size: 0.48rem;
	}

	.preview-body article {
		padding: 1rem clamp(1.3rem, 4vw, 3.2rem) 2.5rem;
	}

	.preview-tools {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 3.6rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid var(--line);
	}

	.preview-tools > * {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		place-items: center;
		color: #68766f;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		font-size: 0.65rem;
	}

	.preview-body article > small {
		color: var(--copper);
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.16em;
	}

	.preview-body article h2 {
		margin: 0.5rem 0 1.2rem;
		font-family: 'Libre Baskerville', serif;
		font-size: clamp(1.35rem, 3vw, 2rem);
		font-weight: 400;
	}

	.preview-body article p {
		font-family: 'Libre Baskerville', serif;
		font-size: 0.7rem;
		line-height: 1.9;
	}

	.confidence {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	.confidence > div {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.6rem 1.2rem;
		color: var(--forest);
		border-right: 1px solid var(--line);
	}

	.confidence > div:last-child {
		border-right: 0;
	}

	.confidence span {
		display: grid;
		gap: 0.2rem;
		color: var(--ink-soft);
		font-size: 0.65rem;
	}

	.confidence strong {
		color: var(--ink);
		font-size: 0.74rem;
	}

	.section {
		padding: 7rem 0 1rem;
	}

	.section-heading {
		max-width: 42rem;
		margin-bottom: 3rem;
	}

	.section-heading.compact {
		margin-bottom: 2rem;
	}

	.section-heading h2,
	.privacy-copy h2,
	.typeset-copy h2,
	.closing-cta h2 {
		margin: 0.7rem 0 1rem;
		font-size: clamp(2rem, 4vw, 3.35rem);
		line-height: 1.12;
	}

	.section-heading > p:last-child,
	.privacy-copy > p:not(.eyebrow),
	.typeset-copy > p,
	.closing-cta p {
		color: var(--ink-soft);
		line-height: 1.75;
	}

	.workflow-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border: 1px solid var(--line);
		border-radius: 1rem;
		overflow: hidden;
	}

	.workflow-grid article {
		position: relative;
		min-height: 17rem;
		padding: 1.5rem;
		background: rgb(251 248 242 / 60%);
		border-right: 1px solid var(--line);
	}

	.workflow-grid article:last-child {
		border-right: 0;
	}

	.workflow-icon,
	.feature-icon {
		display: grid;
		width: 2.9rem;
		height: 2.9rem;
		place-items: center;
		color: var(--forest);
		background: #e2e9e4;
		border-radius: 0.75rem;
	}

	.workflow-grid article > span {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		color: #a9a296;
		font-size: 0.65rem;
		font-weight: 800;
	}

	.workflow-grid h3,
	.feature-grid h3,
	.faq-grid h3,
	.privacy-card h3 {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
	}

	.workflow-grid h3 {
		margin: 2rem 0 0.7rem;
		font-size: 1.15rem;
	}

	.workflow-grid p,
	.feature-grid article > p:not(.eyebrow),
	.faq-grid p {
		color: var(--ink-soft);
		font-size: 0.78rem;
		line-height: 1.7;
	}

	.privacy-section,
	.typeset-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: clamp(3rem, 8vw, 8rem);
		margin-top: 8rem;
	}

	.privacy-copy a,
	.feature-grid a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--forest);
		font-size: 0.78rem;
		font-weight: 800;
		text-decoration: none;
	}

	.privacy-card {
		position: relative;
		padding: 2.2rem;
		background: var(--forest-deep);
		border-radius: 1rem;
		box-shadow: var(--shadow);
		color: white;
	}

	.privacy-orbit {
		display: grid;
		width: 4.5rem;
		height: 4.5rem;
		place-items: center;
		color: var(--forest-deep);
		background: #e5b18c;
		border: 0.7rem solid #3b5a4d;
		border-radius: 50%;
	}

	.privacy-card h3 {
		margin: 1.5rem 0 1rem;
		font-size: 1.6rem;
	}

	.privacy-card ul,
	.typeset-copy ul {
		display: grid;
		gap: 0.85rem;
		padding: 0;
		list-style: none;
	}

	.privacy-card li {
		color: #d7e1dc;
		font-size: 0.8rem;
	}

	.privacy-card li :global(svg) {
		color: #e5b18c;
	}

	.cloud-note {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-top: 1.5rem;
		padding: 0.8rem;
		color: #c1d0c9;
		background: rgb(255 255 255 / 7%);
		border-radius: 0.55rem;
		font-size: 0.7rem;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.feature-grid article {
		display: flex;
		min-height: 24rem;
		flex-direction: column;
		align-items: flex-start;
		padding: 1.8rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0.9rem;
	}

	.feature-grid .eyebrow {
		margin-top: 2rem;
	}

	.feature-grid h3 {
		margin: 0.6rem 0 0.4rem;
		font-size: 1.35rem;
		line-height: 1.35;
	}

	.feature-grid a {
		margin-top: auto;
	}

	.typeset-section {
		padding: 5rem;
		background: #e4ded2;
		border-radius: 1.2rem;
	}

	.typeset-sample {
		padding: 1.4rem;
		background: #d3cab9;
		border-radius: 0.8rem;
		box-shadow: inset 0 0 0 1px rgb(80 70 55 / 9%);
	}

	.book-page {
		position: relative;
		aspect-ratio: 2 / 3;
		padding: 18% 14%;
		background: #fffdf8;
		box-shadow: 0 14px 35px rgb(44 37 29 / 17%);
		font-family: 'Libre Baskerville', serif;
	}

	.book-page > span {
		display: block;
		color: #9b765f;
		font-family: 'Manrope Variable', sans-serif;
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-align: center;
	}

	.book-page h3 {
		margin: 0.7rem 0 2rem;
		font-size: clamp(1rem, 2vw, 1.6rem);
		font-weight: 400;
		line-height: 1.25;
		text-align: center;
	}

	.book-page p {
		font-size: clamp(0.55rem, 0.9vw, 0.72rem);
		line-height: 1.85;
		text-align: justify;
	}

	.book-page .drop-cap::first-letter {
		float: left;
		margin: 0.1rem 0.25rem 0 0;
		font-size: 2.7rem;
		line-height: 0.75;
	}

	.book-page small {
		position: absolute;
		bottom: 6%;
		left: 0;
		width: 100%;
		color: #8b8479;
		font-size: 0.5rem;
		text-align: center;
	}

	.typeset-copy li {
		color: var(--ink-soft);
		font-size: 0.78rem;
	}

	.typeset-copy .button {
		margin-top: 1rem;
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1px;
		background: var(--line);
		border: 1px solid var(--line);
		border-radius: 0.9rem;
		overflow: hidden;
	}

	.faq-grid article {
		padding: 1.8rem;
		background: var(--paper);
	}

	.faq-grid h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.faq-grid p {
		margin: 0;
	}

	.closing-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 7rem;
		padding: 3.5rem;
		color: white;
		background: var(--forest);
		border-radius: 1rem;
	}

	.closing-cta h2 {
		margin-bottom: 0.5rem;
		font-size: clamp(1.8rem, 4vw, 2.8rem);
	}

	.closing-cta p:not(.eyebrow) {
		margin: 0;
		color: #cbd8d2;
	}

	.closing-cta .eyebrow {
		color: #efb38f;
	}

	.closing-cta .button {
		flex: 0 0 auto;
		color: var(--forest-deep);
		background: #f5dcc9;
	}

	@media (max-width: 960px) {
		.hero {
			grid-template-columns: 1fr;
			padding-top: 4rem;
		}

		.hero-copy {
			max-width: 44rem;
		}

		.studio-preview {
			width: min(42rem, 100%);
		}

		.confidence,
		.workflow-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.confidence > div:nth-child(2),
		.workflow-grid article:nth-child(2) {
			border-right: 0;
		}

		.confidence > div:nth-child(-n + 2),
		.workflow-grid article:nth-child(-n + 2) {
			border-bottom: 1px solid var(--line);
		}

		.feature-grid {
			grid-template-columns: 1fr;
		}

		.feature-grid article {
			min-height: 19rem;
		}

		.typeset-section {
			padding: 3rem;
		}
	}

	@media (max-width: 720px) {
		.privacy-section,
		.typeset-section {
			grid-template-columns: 1fr;
			margin-top: 6rem;
		}

		.typeset-sample {
			width: min(24rem, 100%);
		}

		.faq-grid {
			grid-template-columns: 1fr;
		}

		.closing-cta {
			align-items: flex-start;
			flex-direction: column;
			padding: 2rem;
		}
	}

	@media (max-width: 540px) {
		.hero,
		.section,
		.confidence,
		.privacy-section,
		.typeset-section,
		.closing-cta {
			width: min(100% - 1.25rem, 72rem);
		}

		.hero {
			padding-top: 3rem;
		}

		.hero-copy h1 {
			font-size: 2.8rem;
		}

		.studio-preview {
			min-height: 25rem;
			transform: none;
		}

		.preview-bar strong,
		.preview-bar small {
			display: none;
		}

		.preview-body {
			min-height: 22rem;
			grid-template-columns: 6.5rem 1fr;
		}

		.preview-body article {
			padding-inline: 1rem;
		}

		.preview-tools {
			margin-bottom: 2rem;
		}

		.confidence,
		.workflow-grid {
			grid-template-columns: 1fr;
		}

		.confidence > div,
		.confidence > div:nth-child(2),
		.workflow-grid article,
		.workflow-grid article:nth-child(2) {
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}

		.confidence > div:last-child,
		.workflow-grid article:last-child {
			border-bottom: 0;
		}

		.typeset-section {
			padding: 1.2rem;
		}
	}
</style>
