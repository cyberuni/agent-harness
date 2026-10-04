import { fileURLToPath } from 'node:url'
import { run } from '../cli.js'

/** Defined as literals by the skill-script build in `tsdown.config.ts`; nothing else imports this file. */
declare const __PACKAGE_NAME__: string
declare const __PACKAGE_VERSION__: string

// The `reference` skill's `scripts/reference.mjs`, three folders under the plugin root:
// `skills/reference/scripts/`. The plugin root is where this package's own `references/` sit.
//
// Composed into a fresh argv, not spliced into the global one, so nothing outside this file
// observes the rewrite.
process.exitCode = await run([...process.argv.slice(0, 2), 'reference', ...process.argv.slice(2)], {
	name: __PACKAGE_NAME__,
	version: __PACKAGE_VERSION__,
	root: fileURLToPath(new URL('../../..', import.meta.url)),
})
