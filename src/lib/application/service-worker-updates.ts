async function checkForServiceWorkerUpdate() {
	if (!('serviceWorker' in navigator) || !navigator.onLine) return;

	try {
		const registration = await navigator.serviceWorker.getRegistration();
		await registration?.update();
	} catch {
		// An update check can fail while connectivity is changing. The current offline app stays usable.
	}
}

async function removeDevelopmentServiceWorker() {
	if (!('serviceWorker' in navigator)) return;

	try {
		const registration = await navigator.serviceWorker.getRegistration();
		await registration?.unregister();

		const keys = await caches.keys();
		await Promise.all(
			keys.filter((key) => key.startsWith('writeanovel-')).map((key) => caches.delete(key))
		);
	} catch {
		// Development still works if the browser denies service-worker storage cleanup.
	}
}

export function monitorServiceWorkerUpdates() {
	if (import.meta.env.DEV) {
		void removeDevelopmentServiceWorker();
		return () => undefined;
	}

	const check = () => void checkForServiceWorkerUpdate();
	const checkWhenVisible = () => {
		if (document.visibilityState === 'visible') check();
	};

	check();
	window.addEventListener('online', check);
	document.addEventListener('visibilitychange', checkWhenVisible);

	return () => {
		window.removeEventListener('online', check);
		document.removeEventListener('visibilitychange', checkWhenVisible);
	};
}
