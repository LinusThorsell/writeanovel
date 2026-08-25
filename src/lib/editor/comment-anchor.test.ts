import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import {
	CommentAnchor,
	REMOVE_COMMENT_ANCHOR_META,
	commentAnchorSnapshots,
	formatCommentQuote
} from './comment-anchor';

describe('comment anchors', () => {
	let editor: Editor | undefined;

	afterEach(() => editor?.destroy());

	function anchoredText(threadId: string): string {
		let result = '';
		editor?.state.doc.descendants((node) => {
			if (node.isText && node.marks.some((mark) => mark.attrs.threadId === threadId)) {
				result += node.text ?? '';
			}
		});
		return result;
	}

	function anchorRange(threadId: string): { from: number; to: number } {
		let from: number | undefined;
		let to: number | undefined;
		editor?.state.doc.descendants((node, position) => {
			if (!node.isText || !node.marks.some((mark) => mark.attrs.threadId === threadId)) return;
			from = from === undefined ? position : Math.min(from, position);
			to = to === undefined ? position + node.nodeSize : Math.max(to, position + node.nodeSize);
		});
		if (from === undefined || to === undefined)
			throw new Error('The comment anchor was not found.');
		return { from, to };
	}

	it('keeps an anchor attached as text is inserted before and inside it, then serialized', () => {
		const threadId = 'thread-1';
		editor = new Editor({
			extensions: [StarterKit, CommentAnchor],
			content: {
				type: 'doc',
				content: [
					{ type: 'paragraph', content: [{ type: 'text', text: 'The harbor bells sounded.' }] }
				]
			}
		});

		editor
			.chain()
			.setTextSelection({ from: 5, to: 11 })
			.setMark('commentAnchor', { threadId })
			.run();
		expect(anchoredText(threadId)).toBe('harbor');

		editor.chain().setTextSelection(1).insertContent('At dawn, ').run();
		expect(anchoredText(threadId)).toBe('harbor');

		const range = anchorRange(threadId);
		editor
			.chain()
			.setTextSelection(range.from + 3)
			.insertContent('-side-')
			.run();
		expect(anchoredText(threadId)).toBe('har-side-bor');

		const saved = editor.getJSON();
		editor.destroy();
		editor = new Editor({ extensions: [StarterKit, CommentAnchor], content: saved });
		expect(anchoredText(threadId)).toBe('har-side-bor');

		const restoredRange = anchorRange(threadId);
		editor.chain().setTextSelection(restoredRange).insertContent('quay').run();
		expect(anchoredText(threadId)).toBe('quay');
		expect(commentAnchorSnapshots(editor.state.doc).get(threadId)?.quotedText).toBe('quay');
	});

	it('normalizes and truncates text used in comment quotes', () => {
		expect(formatCommentQuote('  harbor\n\t bells  ')).toBe('harbor bells');
		expect(formatCommentQuote('a'.repeat(241))).toBe(`${'a'.repeat(237)}…`);
	});

	it('keeps every typed character anchored when replacing the entire quoted text', () => {
		const threadId = 'thread-2';
		editor = new Editor({
			extensions: [StarterKit, CommentAnchor],
			content: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'harbor' }] }]
			}
		});

		editor
			.chain()
			.setTextSelection({ from: 1, to: 7 })
			.setMark('commentAnchor', { threadId })
			.run();
		editor.chain().setTextSelection({ from: 1, to: 7 }).insertContent('q').run();
		for (const character of 'uay') editor.commands.insertContent(character);

		expect(anchoredText(threadId)).toBe('quay');
		expect(commentAnchorSnapshots(editor.state.doc).get(threadId)?.quotedText).toBe('quay');
	});

	it('allows an anchor to be intentionally removed without deleting its text', () => {
		const threadId = 'thread-3';
		editor = new Editor({
			extensions: [StarterKit, CommentAnchor],
			content: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep this text.' }] }]
			}
		});

		editor
			.chain()
			.setTextSelection({ from: 6, to: 10 })
			.setMark('commentAnchor', { threadId })
			.run();
		const range = anchorRange(threadId);
		const transaction = editor.state.tr
			.removeMark(range.from, range.to, editor.schema.marks.commentAnchor)
			.setMeta(REMOVE_COMMENT_ANCHOR_META, threadId);
		editor.view.dispatch(transaction);

		expect(anchoredText(threadId)).toBe('');
		expect(editor.getText()).toBe('Keep this text.');
	});
});
