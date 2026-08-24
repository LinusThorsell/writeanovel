import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
		coverage: {
			reporter: ['text', 'html']
		}
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
