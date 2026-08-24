import type { Attachment } from 'svelte/attachments';

const STORAGE_PREFIX = 'writeanovel:editor-scroll:';
const RESTORE_FRAME_LIMIT = 90;

export type EditorScrollPosition = {
	pixels: number;
	progress: number;
};

function storageKey(itemId: string): string {
	return `${STORAGE_PREFIX}${itemId}`;
}

export function loadEditorScrollPosition(itemId: string): EditorScrollPosition {
	if (typeof localStorage === 'undefined') return { pixels: 0, progress: 0 };
	try {
		const [pixelValue = '0', extentValue = '0'] = (
			localStorage.getItem(storageKey(itemId)) ?? '0'
		).split('|', 2);
		const pixels = Number.parseFloat(pixelValue);
		const extent = Number.parseFloat(extentValue);
		const safePixels = Number.isFinite(pixels) && pixels > 0 ? pixels : 0;
		const progress = Number.isFinite(extent) && extent > 0 ? safePixels / extent : 0;
		return { pixels: safePixels, progress: Math.min(1, Math.max(0, progress)) };
	} catch {
		return { pixels: 0, progress: 0 };
	}
}

export function saveEditorScrollPosition(
	itemId: string,
	position: number,
	maximumScroll: number
): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(
			storageKey(itemId),
			`${Math.max(0, Math.round(position))}|${Math.max(0, Math.round(maximumScroll))}`
		);
	} catch {
		// Writing must remain usable when browser storage is unavailable or full.
	}
}

export function preserveEditorScrollPosition(itemId: string | undefined): Attachment<HTMLElement> {
	return (element) => {
		if (!itemId) return;

		let storedPosition = loadEditorScrollPosition(itemId);
		let restoreFrame: number | undefined;
		let saveFrame: number | undefined;
		let restoreAttempts = 0;
		let restoring = true;
		let restoreEnabled = true;

		const maximumScroll = () => Math.max(0, element.scrollHeight - element.clientHeight);
		const persist = () => {
			const extent = maximumScroll();
			saveEditorScrollPosition(itemId, element.scrollTop, extent);
			storedPosition = {
				pixels: element.scrollTop,
				progress: extent > 0 ? element.scrollTop / extent : 0
			};
		};
		const scheduleSave = () => {
			if (restoring || saveFrame !== undefined) return;
			saveFrame = requestAnimationFrame(() => {
				saveFrame = undefined;
				persist();
			});
		};

		const restore = () => {
			restoreFrame = undefined;
			if (!restoreEnabled) {
				restoring = false;
				return;
			}
			restoring = true;
			restoreAttempts += 1;
			const availablePosition = maximumScroll();
			const targetPosition =
				storedPosition.progress > 0
					? availablePosition * storedPosition.progress
					: Math.min(storedPosition.pixels, availablePosition);
			element.scrollTop = targetPosition;

			if (restoreAttempts >= RESTORE_FRAME_LIMIT) {
				restoring = false;
				return;
			}
			restoreFrame = requestAnimationFrame(restore);
		};

		const interruptRestore = () => {
			restoreEnabled = false;
			restoring = false;
			scheduleSave();
		};

		element.addEventListener('scroll', scheduleSave, { passive: true });
		element.addEventListener('wheel', interruptRestore, { passive: true });
		element.addEventListener('pointerdown', interruptRestore, { passive: true });
		element.addEventListener('touchstart', interruptRestore, { passive: true });
		element.addEventListener('keydown', interruptRestore);

		const resizeObserver = new ResizeObserver(() => {
			if (restoreEnabled && restoreFrame === undefined)
				restoreFrame = requestAnimationFrame(restore);
		});
		const editorShell = element.querySelector<HTMLElement>('.editor-shell');
		resizeObserver.observe(editorShell ?? element);
		restoreFrame = requestAnimationFrame(restore);

		return () => {
			resizeObserver.disconnect();
			element.removeEventListener('scroll', scheduleSave);
			element.removeEventListener('wheel', interruptRestore);
			element.removeEventListener('pointerdown', interruptRestore);
			element.removeEventListener('touchstart', interruptRestore);
			element.removeEventListener('keydown', interruptRestore);
			if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame);
			if (saveFrame !== undefined) cancelAnimationFrame(saveFrame);
			if (!restoring) persist();
		};
	};
}
