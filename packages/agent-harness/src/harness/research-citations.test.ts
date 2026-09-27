import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const srcDir = join(import.meta.dirname, '..')
const evidencePath = join(import.meta.dirname, '../../../../.research/harness-detection/evidence.md')

async function sourceFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true, recursive: true })
	return entries
		.filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
		.map((e) => join(e.parentPath, e.name))
}

describe('research citations', () => {
	it('cites only evidence IDs that exist in .research/harness-detection/evidence.md', async () => {
		const evidence = await readFile(evidencePath, 'utf8')
		const known = new Set([...evidence.matchAll(/^\| (E-[A-Z]+-[A-Z]\d+) \|/gm)].map((m) => m[1]))

		const cited = new Set<string>()
		for (const file of await sourceFiles(srcDir)) {
			const text = await readFile(file, 'utf8')
			for (const match of text.matchAll(/\bE-(?:CC|CUR|CODEX|COPILOT|OC|KILO|GEM|QWEN|VSC|CLINE)-[A-Z]\d+\b/g))
				cited.add(match[0])
		}

		expect(cited.size).toBeGreaterThan(0)
		expect([...cited].filter((id) => !known.has(id))).toEqual([])
	})
})
