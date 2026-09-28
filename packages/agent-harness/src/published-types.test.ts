import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { expect, it } from 'vitest'

// TypeScript 6 defaults `types` to `[]`, so a consumer without `@types/node` in its types must
// still be able to load the published declarations. `pnpm test` builds `dist` first.
it('the published declarations type-check without @types/node', () => {
	const dir = mkdtempSync(join(tmpdir(), 'agent-harness-types-'))
	try {
		writeFileSync(
			join(dir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					types: [],
					strict: true,
					noEmit: true,
					target: 'ES2022',
					module: 'NodeNext',
					moduleResolution: 'NodeNext',
				},
				files: [resolve(import.meta.dirname, '../dist/index.d.ts')],
			}),
		)
		const tsc = resolve(import.meta.dirname, '../node_modules/.bin/tsc')
		expect(() => execFileSync(tsc, ['-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' })).not.toThrow()
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
