async function waitForImages(root: HTMLElement): Promise<void> {
	const images = Array.from(root.querySelectorAll('img'));
	await Promise.all(
		images.map(async (image) => {
			if (image.complete) return;
			await image.decode().catch(() => undefined);
		})
	);
}

export async function printBrowserBook(root: HTMLElement, title: string): Promise<void> {
	await Promise.all([document.fonts.ready, waitForImages(root)]);
	const originalTitle = document.title;
	document.title = title.trim() || 'Untitled novel';
	try {
		window.print();
	} finally {
		document.title = originalTitle;
	}
}
