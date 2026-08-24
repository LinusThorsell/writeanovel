import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

type PageBreak = {
	pos: number;
	pageNumber: number;
};

type PaginationState = {
	breaks: PageBreak[];
	decorations: DecorationSet;
	pageCount: number;
};

type PaginationMeta = {
	breaks: PageBreak[];
	pageCount: number;
};

export type PaginationOptions = {
	onPageCount: (pageCount: number) => void;
};

const paginationKey = new PluginKey<PaginationState>('writeanovelPagination');
const paginationMetaKey = 'writeanovelPaginationMeta';
const MAX_EDITOR_PAGES = 2_000;

function cssPixels(style: CSSStyleDeclaration, property: string): number {
	const value = Number.parseFloat(style.getPropertyValue(property));
	return Number.isFinite(value) ? value : 0;
}

function sameBreaks(left: PageBreak[], right: PageBreak[]): boolean {
	return (
		left.length === right.length &&
		left.every(
			(pageBreak, index) =>
				pageBreak.pos === right[index]?.pos && pageBreak.pageNumber === right[index]?.pageNumber
		)
	);
}

function pageBreakDecoration(pageBreak: PageBreak): Decoration {
	return Decoration.widget(
		pageBreak.pos,
		() => {
			const element = document.createElement('span');
			element.className = 'page-break-decoration';
			element.dataset.nextPage = String(pageBreak.pageNumber);
			element.setAttribute('aria-hidden', 'true');
			return element;
		},
		{ key: `writeanovel-page-${pageBreak.pageNumber}`, side: -1 }
	);
}

function contentBottom(editorElement: HTMLElement, contentTop: number): number {
	let bottom = contentTop;
	for (const child of editorElement.children) {
		if (!(child instanceof HTMLElement) || child.classList.contains('page-break-decoration'))
			continue;
		bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
	}
	return bottom;
}

function measurePagination(view: EditorView): PaginationMeta {
	const editorElement = view.dom;
	editorElement.classList.add('pagination-measuring');

	try {
		const style = getComputedStyle(editorElement);
		const bounds = editorElement.getBoundingClientRect();
		const pageHeight = cssPixels(style, '--page-height');
		const pageMarginBlock = cssPixels(style, '--page-margin-block');
		const inlinePadding = Number.parseFloat(style.paddingInlineStart) || 0;
		const printableHeight = Math.max(1, pageHeight - pageMarginBlock * 2);
		const contentTop = bounds.top + pageMarginBlock;
		const flowHeight = Math.max(0, contentBottom(editorElement, contentTop) - contentTop);
		const pageCount = Math.min(
			MAX_EDITOR_PAGES,
			Math.max(1, Math.ceil((flowHeight + 0.5) / printableHeight))
		);
		const breaks: PageBreak[] = [];
		let previousPosition = -1;

		for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
			const position = view.posAtCoords({
				left: bounds.left + inlinePadding + 2,
				top: contentTop + printableHeight * pageIndex
			});
			if (!position || position.pos <= 0 || position.pos >= view.state.doc.content.size) continue;
			if (position.pos === previousPosition) continue;
			breaks.push({ pos: position.pos, pageNumber: breaks.length + 2 });
			previousPosition = position.pos;
		}

		return { breaks, pageCount: breaks.length + 1 };
	} finally {
		editorElement.classList.remove('pagination-measuring');
	}
}

export const Pagination = Extension.create<PaginationOptions>({
	name: 'writeanovelPagination',

	addOptions() {
		return {
			onPageCount: () => undefined
		};
	},

	addProseMirrorPlugins() {
		const onPageCount = this.options.onPageCount;

		return [
			new Plugin<PaginationState>({
				key: paginationKey,
				state: {
					init: () => ({
						breaks: [],
						decorations: DecorationSet.empty,
						pageCount: 1
					}),
					apply: (transaction, currentState) => {
						const meta = transaction.getMeta(paginationMetaKey) as PaginationMeta | undefined;
						if (meta) {
							return {
								breaks: meta.breaks,
								decorations: DecorationSet.create(
									transaction.doc,
									meta.breaks.map(pageBreakDecoration)
								),
								pageCount: meta.pageCount
							};
						}

						return {
							breaks: currentState.breaks.map((pageBreak) => ({
								...pageBreak,
								pos: transaction.mapping.map(pageBreak.pos)
							})),
							decorations: currentState.decorations.map(transaction.mapping, transaction.doc),
							pageCount: currentState.pageCount
						};
					}
				},
				props: {
					decorations: (state) => paginationKey.getState(state)?.decorations ?? DecorationSet.empty
				},
				view: (initialView) => {
					let animationFrame: number | undefined;
					let editorView = initialView;

					const measure = () => {
						animationFrame = undefined;
						const next = measurePagination(editorView);
						const current = paginationKey.getState(editorView.state);
						if (current && sameBreaks(current.breaks, next.breaks)) {
							if (current.pageCount !== next.pageCount) onPageCount(next.pageCount);
							return;
						}

						onPageCount(next.pageCount);
						editorView.dispatch(
							editorView.state.tr.setMeta(paginationMetaKey, next).setMeta('addToHistory', false)
						);
					};

					const scheduleMeasurement = () => {
						if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
						animationFrame = requestAnimationFrame(measure);
					};

					const resizeObserver = new ResizeObserver(scheduleMeasurement);
					resizeObserver.observe(initialView.dom);
					scheduleMeasurement();

					return {
						update: (updatedView, previousState) => {
							editorView = updatedView;
							if (!previousState.doc.eq(updatedView.state.doc)) scheduleMeasurement();
						},
						destroy: () => {
							resizeObserver.disconnect();
							if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
						}
					};
				}
			})
		];
	}
});
