import { defineConfig } from 'tsdown'

// This package has no runtime dependencies at all, so there is nothing that needs
// bundling: `dist/index.js` is the library surface consumers import directly.
export default defineConfig({
	entry: { index: 'src/index.ts' },
	outDir: 'dist',
	format: 'esm',
	platform: 'node',
	dts: true,
	clean: true,
})
