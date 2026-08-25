/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const worker: ServiceWorkerGlobalScope = self;
const cachePrefix = 'writeanovel-';
const cacheName = `${cachePrefix}${version}`;
const applicationAssets = [...build, ...files, ...prerendered];
const editorPath = '/app';

async function reloadOpenEditors() {
	// Give the editor's debounced local save a moment to finish before replacing the document.
	await new Promise((resolve) => setTimeout(resolve, 750));

	const openWindows = await worker.clients.matchAll({
		type: 'window',
		includeUncontrolled: true
	});

	for (const client of openWindows) {
		const clientUrl = new URL(client.url);
		const isEditor =
			clientUrl.origin === worker.location.origin &&
			(clientUrl.pathname === editorPath || clientUrl.pathname.startsWith(`${editorPath}/`));

		// Do not await navigate here: the navigation itself waits for activation to finish.
		if (isEditor) void client.navigate(client.url).catch(() => undefined);
	}
}

async function deleteObsoleteApplicationCaches() {
	const keys = await caches.keys();
	const obsoleteCaches = keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName);

	await Promise.all(obsoleteCaches.map((key) => caches.delete(key)));
	return obsoleteCaches;
}

if (import.meta.env.DEV) {
	worker.addEventListener('install', (event) => {
		event.waitUntil(worker.skipWaiting());
	});

	worker.addEventListener('activate', (event) => {
		event.waitUntil(
			(async () => {
				const keys = await caches.keys();
				const applicationCaches = keys.filter((key) => key.startsWith(cachePrefix));

				await Promise.all(applicationCaches.map((key) => caches.delete(key)));
				await worker.clients.claim();

				if (applicationCaches.length > 0) {
					await reloadOpenEditors();
				} else {
					await worker.registration.unregister();
				}
			})()
		);
	});
} else {
	worker.addEventListener('install', (event) => {
		event.waitUntil(
			(async () => {
				const cache = await caches.open(cacheName);
				await cache.addAll(applicationAssets);
				await worker.skipWaiting();
			})()
		);
	});

	worker.addEventListener('activate', (event) => {
		event.waitUntil(
			(async () => {
				const obsoleteCaches = await deleteObsoleteApplicationCaches();

				await worker.clients.claim();

				if (obsoleteCaches.length > 0) await reloadOpenEditors();
			})()
		);
	});

	worker.addEventListener('fetch', (event) => {
		if (event.request.method !== 'GET') return;

		const requestUrl = new URL(event.request.url);
		if (requestUrl.origin !== worker.location.origin) return;

		event.respondWith(
			(async () => {
				const cache = await caches.open(cacheName);
				const cached = await cache.match(event.request);

				if (
					event.request.mode !== 'navigate' &&
					applicationAssets.includes(requestUrl.pathname) &&
					cached
				) {
					return cached;
				}

				try {
					const response = await fetch(event.request);
					if (response.ok) await cache.put(event.request, response.clone());
					return response;
				} catch (error) {
					if (cached) return cached;
					if (event.request.mode === 'navigate') {
						const fallbackPath = requestUrl.pathname.startsWith('/app') ? '/app' : '/';
						const shell = await cache.match(fallbackPath);
						if (shell) return shell;
					}
					throw error;
				}
			})()
		);
	});
}
