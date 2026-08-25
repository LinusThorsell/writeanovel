import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

const developmentServiceWorkerSource = `
const cachePrefix = 'writeanovel-';

self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		const applicationCaches = keys.filter((key) => key.startsWith(cachePrefix));

		await Promise.all(applicationCaches.map((key) => caches.delete(key)));
		await self.clients.claim();

		if (applicationCaches.length === 0) {
			await self.registration.unregister();
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 750));
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

		for (const client of clients) {
			const url = new URL(client.url);
			if (url.origin === self.location.origin && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
				void client.navigate(client.url);
			}
		}
	})());
});
`;

function developmentServiceWorker(): Plugin {
	return {
		name: 'writeanovel-development-service-worker',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (request.url?.split('?')[0] !== '/service-worker.js') return next();

				response.statusCode = 200;
				response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
				response.setHeader('Cache-Control', 'no-store');
				response.end(developmentServiceWorkerSource);
			});
		}
	};
}

export default defineConfig({
	envPrefix: ['VITE_', 'PUBLIC_'],
	plugins: [developmentServiceWorker(), sveltekit()],
	server: {
		watch: {
			usePolling: process.env.VITE_USE_POLLING === 'true',
			interval: 100
		}
	}
});
