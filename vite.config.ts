import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const staticAdapter = () => ({
	name: 'static-adapter',
	async adapt(builder: any) {
		const out = 'build';
		builder.rimraf(out);
		builder.writeClient(out);
		builder.writePrerendered(out);
		await builder.generateFallback(`${out}/404.html`);
		builder.log.success(`Successfully adapted static site to "${out}"`);
	}
});

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: staticAdapter()
		})
	]
});
