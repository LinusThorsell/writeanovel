import { Mark, mergeAttributes } from '@tiptap/core';
import type { Mark as ProseMirrorMark, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';

type AnchorRange = {
	from: number;
	to: number;
	mark: ProseMirrorMark;
};

export type CommentAnchorSnapshot = {
	from: number;
	to: number;
	quotedText: string;
};

const MAX_QUOTED_TEXT_LENGTH = 240;
export const REMOVE_COMMENT_ANCHOR_META = 'removeCommentAnchor';

export function formatCommentQuote(value: string): string {
	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > MAX_QUOTED_TEXT_LENGTH
		? `${normalized.slice(0, MAX_QUOTED_TEXT_LENGTH - 3)}…`
		: normalized;
}

function commentRanges(document: ProseMirrorNode, markName: string): Map<string, AnchorRange> {
	const ranges = new Map<string, AnchorRange>();
	document.descendants((node, position) => {
		if (!node.isText) return;
		for (const mark of node.marks) {
			if (mark.type.name !== markName || typeof mark.attrs.threadId !== 'string') continue;
			const existing = ranges.get(mark.attrs.threadId);
			ranges.set(mark.attrs.threadId, {
				from: existing ? Math.min(existing.from, position) : position,
				to: existing ? Math.max(existing.to, position + node.nodeSize) : position + node.nodeSize,
				mark
			});
		}
	});
	return ranges;
}

export function commentAnchorSnapshots(
	document: ProseMirrorNode,
	markName = 'commentAnchor'
): Map<string, CommentAnchorSnapshot> {
	return new Map(
		[...commentRanges(document, markName)].map(([threadId, range]) => [
			threadId,
			{
				from: range.from,
				to: range.to,
				quotedText: formatCommentQuote(document.textBetween(range.from, range.to, ' '))
			}
		])
	);
}

export const CommentAnchor = Mark.create({
	name: 'commentAnchor',
	inclusive: false,
	excludes: '',

	addAttributes() {
		return {
			threadId: {
				default: null,
				parseHTML: (element: HTMLElement) => element.dataset.commentThreadId ?? null,
				renderHTML: (attributes: { threadId?: string }) =>
					attributes.threadId ? { 'data-comment-thread-id': attributes.threadId } : {}
			}
		};
	},

	parseHTML() {
		return [{ tag: 'mark[data-comment-thread-id]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['mark', mergeAttributes({ class: 'comment-anchor' }, HTMLAttributes), 0];
	},

	addProseMirrorPlugins() {
		const markName = this.name;
		return [
			new Plugin({
				appendTransaction(transactions, oldState, newState) {
					if (!transactions.some((transaction) => transaction.docChanged)) return null;
					if (transactions.some((transaction) => transaction.getMeta(REMOVE_COMMENT_ANCHOR_META)))
						return null;
					const oldRanges = commentRanges(oldState.doc, markName);
					if (oldRanges.size === 0) return null;
					const newRanges = commentRanges(newState.doc, markName);
					const transaction = newState.tr;
					const continuedMarks: ProseMirrorMark[] = [];
					for (const mark of oldState.storedMarks ?? []) {
						if (mark.type.name !== markName || typeof mark.attrs.threadId !== 'string') continue;
						const range = newRanges.get(mark.attrs.threadId);
						if (
							range &&
							newState.selection.empty &&
							newState.selection.from >= range.from &&
							newState.selection.from <= range.to
						) {
							continuedMarks.push(mark);
						}
					}

					for (const [threadId, range] of oldRanges) {
						if (newRanges.has(threadId)) continue;
						let from = range.from;
						let to = range.to;
						for (const sourceTransaction of transactions) {
							from = sourceTransaction.mapping.map(from, -1);
							to = sourceTransaction.mapping.map(to, 1);
						}
						if (from >= to || !newState.doc.textBetween(from, to, ' ').trim()) continue;
						transaction.addMark(from, to, range.mark.type.create(range.mark.attrs));
						if (
							newState.selection.empty &&
							newState.selection.from >= from &&
							newState.selection.from <= to
						) {
							continuedMarks.push(range.mark);
						}
					}

					if (continuedMarks.length > 0) {
						let storedMarks = transaction.storedMarks ?? transaction.selection.$head.marks();
						for (const mark of continuedMarks) storedMarks = mark.addToSet(storedMarks);
						transaction.ensureMarks(storedMarks);
					}

					return transaction.docChanged || transaction.storedMarksSet ? transaction : null;
				}
			})
		];
	}
});
