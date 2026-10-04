import { defineConfig } from 'tsdown'

// Dependencies stay external: `createReferenceCommand` must compose into the host CLI's own
// `clibuilder` instance, not a private inlined copy that breaks command-registry identity.
// tsdown 0.23 defaults to `.mjs`/`.d.mts` on the node platform; `fixedExtension: false`
// keeps the `.js`/`.d.ts` names the package.json `exports` map points at.
const shared = {
	outDir: 'dist',
	format: 'esm',
	platform: 'node',
	fixedExtension: false,
} as const

export default defineConfig([
	{
		...shared,
		entry: {
			index: 'src/index.ts',
			commands: 'src/commands.ts',
		},
		dts: true,
		clean: true,
	},
	{
		// The bin's entry; nothing imports it, so it ships no declarations.
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
	},
])
