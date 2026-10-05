import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cli, exitCodes } from 'clibuilder'
import { createReferenceCommand } from './references/reference.command.js'

/** Who runs the CLI: the plugin's name, the package's version, and the folder its own `references/` sit in. */
export type CliHost = { name: string; version: string; root: string }

function readJson<T>(url: URL): T {
	return JSON.parse(readFileSync(url, 'utf8')) as T
}

/**
 * Read from `../plugin.json` and `../package.json`, which resolve from `src/cli.ts` and `dist/cli.js`
 * alike. The skill script, shipped with no package tree beside it, passes its own host instead.
 */
function packageHost(): CliHost {
	const manifest = new URL('../package.json', import.meta.url)
	const { name } = readJson<{ name: string }>(new URL('../plugin.json', import.meta.url))
	const { version } = readJson<{ version: string }>(manifest)
	return { name, version, root: dirname(fileURLToPath(manifest)) }
}

// A factory, not a module-level constant: `cli()` builds state, and state built at import time
// would be shared by every later call in the process.
function app({ name, version, root }: CliHost) {
	return cli({
		name: 'agent-harness',
		version,
		description: 'Work with the AI agent harness running here: read its layered reference documents.',
	}).command(createReferenceCommand({ plugin: { name, root } }))
}

/** argv in, exit code out — returned rather than written, so a caller that is not the process can act on it. */
export async function run(argv: string[], host: CliHost = packageHost()): Promise<number> {
	try {
		const code = await app(host).parse<number | undefined>(argv)
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// stderr, not stdout — stdout carries TOON an agent parses.
		process.stderr.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		return exitCodes.usage
	}
}
