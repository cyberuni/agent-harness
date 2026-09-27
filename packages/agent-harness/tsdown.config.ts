import { defineConfig } from 'tsdown'

// This package has no runtime dependencies at all, so there is nothing that needs
// bundling: `dist/index.js` is the library surface consumers import directly.
// tsdown 0.23 defaults to `.mjs`/`.d.mts` on the node platform; `fixedExtension: false`
// keeps the `.js`/`.d.ts` names the package.json `exports` map points at.
export default defineConfig({
	entry: { index: 'src/index.ts' },
	outDir: 'dist',
	format: 'esm',
	platform: 'node',
	dts: true,
	clean: true,
	fixedExtension: false,
})
