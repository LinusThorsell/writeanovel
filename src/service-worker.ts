/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const worker: ServiceWorkerGlobalScope = self;
const cacheName = `writeabook-${version}`;
const applicationAssets = [...build, ...files, ...prerendered];

worker.addEventListener('install', (event) => {
	event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(applicationAssets)));
	worker.skipWaiting();
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
			)
			.then(() => worker.clients.claim())
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

			if (applicationAssets.includes(requestUrl.pathname) && cached) return cached;

			try {
				const response = await fetch(event.request);
				if (response.ok) await cache.put(event.request, response.clone());
				return response;
			} catch (error) {
				if (cached) return cached;
				if (event.request.mode === 'navigate') {
					const shell = await cache.match('/');
					if (shell) return shell;
				}
				throw error;
			}
		})()
	);
});
