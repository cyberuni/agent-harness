import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadHarnessIds, loadSkillsDirectories } from './harness-drift.mjs'
import {
	acceptVendor,
	assertVendorBaseline,
	compareVendor,
	ExtractionError,
	extractPaths,
	hashText,
	readSource,
	readSources,
	section,
} from './vendor-drift.mjs'

const here = dirname(fileURLToPath(import.meta.url))

const page = [
	'# Skills',
	'',
	'Intro mentions `.other/skills` outside the section.',
	'',
	'## Where skills load',
	'',
	'| Scope | Path |',
	'| --- | --- |',
	'| Personal | `~/.claude/skills/<name>/SKILL.md` |',
	'| Project | `.claude/skills/<name>/SKILL.md` |',
	'',
	'```sh',
	'# not a heading',
	'```',
	'',
	'### Nested',
	'',
	'Also `$HOME/.agents/skills`.',
	'',
	'## Memory',
	'',
	'Claude reads `CLAUDE.md`, `~/.claude/CLAUDE.md`, and `.github/copilot-instructions.md`; see the rules.',
	'',
].join('\n')

const source = (overrides = {}) => ({
	harness: 'claude-code',
	axis: 'skills',
	evidence: 'E-CC-L1',
	confidence: 'High — vendor doc',
	cited: 'https://example.com/skills',
	url: 'https://example.com/skills.md',
	section: 'Where skills load',
	paths: ['.claude/skills', '~/.claude/skills', '~/.agents/skills'],
	...overrides,
})

describe('section', () => {
	it('runs from the heading to the next heading of the same or a higher level, skipping code fences', () => {
		const text = section(page, 'Where skills load')
		assert.match(text, /^## Where skills load/)
		assert.match(text, /### Nested/)
		assert.doesNotMatch(text, /## Memory/)
	})

	it('fails when the heading is gone', () => {
		assert.throws(() => section(page, 'Skill locations'), ExtractionError)
	})
})

describe('extractPaths', () => {
	it('reads skills directories, normalizing $HOME to ~', () => {
		assert.deepEqual(extractPaths(section(page, 'Where skills load'), 'skills'), [
			'.claude/skills',
			'~/.agents/skills',
			'~/.claude/skills',
		])
	})

	it('reads instruction files without picking up prose', () => {
		assert.deepEqual(extractPaths(section(page, 'Memory'), 'instructions'), [
			'.github/copilot-instructions.md',
			'CLAUDE.md',
			'~/.claude/CLAUDE.md',
		])
	})
})

describe('readSource', () => {
	it('reduces a section to its paths', () => {
		assert.deepEqual(readSource(source(), page).paths, ['.claude/skills', '~/.agents/skills', '~/.claude/skills'])
	})

	it('reduces a hash-mode section to a hash of its text', () => {
		const { hash } = readSource(source({ mode: 'hash' }), page)
		assert.equal(hash, hashText(section(page, 'Where skills load')))
	})

	it('fails on a restructured page rather than reading it as clean', () => {
		assert.throws(() => readSource(source({ section: 'Skill locations' }), page), /not found/)
		assert.throws(() => readSource(source(), '## Where skills load\n\n## Next\n'), /is empty/)
		assert.throws(() => readSource(source(), '## Where skills load\n\nSkills are files.\n'), /names no skills paths/)
	})
})

describe('readSources', () => {
	it('fetches each URL once', async () => {
		const fetched = []
		const baseline = { sources: [source(), source({ axis: 'instructions', section: 'Memory', paths: [] })] }
		const readings = await readSources(baseline, async (url) => {
			fetched.push(url)
			return page
		})
		assert.deepEqual(fetched, ['https://example.com/skills.md'])
		assert.deepEqual(readings[1].paths, ['.github/copilot-instructions.md', 'CLAUDE.md', '~/.claude/CLAUDE.md'])
	})

	it('turns a fetch failure into an extraction failure', async () => {
		await assert.rejects(
			readSources({ sources: [source()] }, async () => {
				throw new Error('HTTP 404')
			}),
			(error) => error instanceof ExtractionError && /HTTP 404/.test(error.message),
		)
	})
})

describe('compareVendor', () => {
	const directories = {
		'claude-code': { project: ['.claude/skills'], user: ['.claude/skills'], research: ['E-CC-L1'] },
	}

	it('reports nothing when the section names what was reviewed', () => {
		const baseline = { sources: [source()] }
		const readings = { 0: { paths: source().paths } }
		assert.deepEqual(compareVendor({ baseline, readings, directories }), [])
	})

	it('reports added and removed paths on the source axis, with the evidence and confidence', () => {
		const baseline = { sources: [source({ confidence: 'Medium — implied' })] }
		const readings = { 0: { paths: ['.claude/skills', '~/.claude/skills', '.agents/skills'] } }
		const findings = compareVendor({ baseline, readings, directories })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.axis, f.path, f.evidence, f.confidence]),
			[
				['vendor-path-added', 'skills', '.agents/skills', 'E-CC-L1', 'Medium — implied'],
				['vendor-path-removed', 'skills', '~/.agents/skills', 'E-CC-L1', 'Medium — implied'],
			],
		)
	})

	it('reports a recorded skills directory the docs stop naming, whatever the baseline says', () => {
		const baseline = { sources: [source({ paths: ['.claude/skills'] })] }
		const readings = { 0: { paths: ['.claude/skills'] } }
		const findings = compareVendor({ baseline, readings, directories })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.path]),
			[['recorded-dir-undocumented', '~/.claude/skills']],
		)
	})

	it('reports a changed hash-mode section', () => {
		const baseline = { sources: [source({ axis: 'instructions', mode: 'hash', hash: 'old' })] }
		const findings = compareVendor({ baseline, readings: { 0: { hash: 'new' } } })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.axis]),
			[['vendor-section-changed', 'instructions']],
		)
	})

	it('accepts the current readings into the baseline', () => {
		const baseline = { reviewed: 'old', sources: [source(), source({ mode: 'hash', hash: 'old' })] }
		const next = acceptVendor(baseline, { 0: { paths: ['.x/skills'] }, 1: { hash: 'new' } }, '2026-09-28')
		assert.equal(next.reviewed, '2026-09-28')
		assert.deepEqual(next.sources[0].paths, ['.x/skills'])
		assert.equal(next.sources[1].hash, 'new')
		assert.equal(next.sources[0].evidence, 'E-CC-L1')
	})
})

describe('vendor-baseline.json', () => {
	const baseline = JSON.parse(readFileSync(join(here, 'vendor-baseline.json'), 'utf8'))
	const evidence = readFileSync(join(here, '..', '.research', 'harness-detection', 'evidence.md'), 'utf8')
	const rows = new Map(
		[...evidence.matchAll(/^\| (E-[A-Z]+-[A-Z]+\d+) \|(.*)\|$/gm)].map((match) => [
			match[1],
			match[2].split(' | ').map((cell) => cell.trim()),
		]),
	)

	it('is well formed', () => {
		assert.doesNotThrow(() => assertVendorBaseline(baseline))
	})

	it('watches a primary vendor source for every supported harness', async () => {
		const harnessIds = await loadHarnessIds()
		const watched = new Set(baseline.sources.map((s) => s.harness))
		assert.deepEqual(
			harnessIds.filter((id) => !watched.has(id)),
			[],
		)
	})

	it('records the evidence ID, cited URL, and confidence of an existing research claim', () => {
		for (const s of baseline.sources) {
			const row = rows.get(s.evidence)
			assert.ok(row, `${s.harness} ${s.axis}: ${s.evidence} is not in evidence.md`)
			const [, cited, , , confidence] = row
			assert.ok(cited.includes(s.cited), `${s.evidence}: evidence.md does not cite ${s.cited}`)
			assert.equal(s.confidence, confidence, `${s.evidence}: confidence differs from evidence.md`)
		}
	})

	it('backs each skills source with the evidence skillsDirectories() cites', async () => {
		const directories = await loadSkillsDirectories(await loadHarnessIds())
		for (const s of baseline.sources.filter((s) => s.axis === 'skills' && directories[s.harness]))
			assert.ok(directories[s.harness].research.includes(s.evidence), `${s.harness}: ${s.evidence}`)
	})
})
