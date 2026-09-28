import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
	assertHarnessIds,
	compare,
	issueBody,
	loadHarnessIds,
	loadSkillsDirectories,
	normalizeGlobal,
	ParseError,
	parseUpstream,
	upstreamName,
} from './harness-drift.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'harness-drift.mjs')

function entry(name, skillsDir, globalSkillsDir, key = name.includes('-') ? `'${name}'` : name) {
	return [
		`  ${key}: {`,
		`    name: '${name}',`,
		`    displayName: '${name}',`,
		`    skillsDir: '${skillsDir}',`,
		`    globalSkillsDir: ${globalSkillsDir},`,
		'    detectInstalled: async () => {',
		'      return existsSync(home);',
		'    },',
		'  },',
	].join('\n')
}

function registry(...entries) {
	return [
		"import { join } from 'path';",
		'export const agents: Record<AgentType, AgentConfig> = {',
		...entries,
		'};',
		'',
		'export function getAgentConfig(type) {',
		'  return agents[type];',
		'}',
	].join('\n')
}

const claude = entry('claude-code', '.claude/skills', "join(claudeHome, 'skills')")
const cursor = entry('cursor', '.agents/skills', "join(home, '.cursor/skills')")
const universal = entry('universal', '.agents/skills', "join(configHome, 'agents/skills')")

describe('parseUpstream', () => {
	it('reads both skills directories per agent and skips the universal pseudo-agent', () => {
		assert.deepEqual(parseUpstream(registry(claude, cursor, universal)), {
			'claude-code': { skillsDir: '.claude/skills', globalSkillsDir: '{claudeHome}/skills' },
			cursor: { skillsDir: '.agents/skills', globalSkillsDir: '{home}/.cursor/skills' },
		})
	})

	it('keeps an undefined global directory as null and other expressions verbatim', () => {
		const eve = entry('eve', 'agent/skills', 'undefined')
		const openclaw = entry('openclaw', 'skills', 'getOpenClawGlobalSkillsDir()')
		assert.deepEqual(parseUpstream(registry(eve, openclaw)), {
			eve: { skillsDir: 'agent/skills', globalSkillsDir: null },
			openclaw: { skillsDir: 'skills', globalSkillsDir: 'getOpenClawGlobalSkillsDir()' },
		})
	})

	it('fails when the agents literal is missing', () => {
		assert.throws(() => parseUpstream('export const other = {};'), ParseError)
	})

	it('fails when no entries parse', () => {
		assert.throws(() => parseUpstream(registry()), /parsed zero agents/)
	})

	it('fails when an entry key is not at the expected indent', () => {
		const shifted = claude.replace("  'claude-code': {", "    'claude-code': {")
		assert.throws(() => parseUpstream(registry(shifted, cursor)), /agent keys but .* entry closings/)
	})

	it('fails when skillsDir is not a string literal', () => {
		const computed = cursor.replace("skillsDir: '.agents/skills'", "skillsDir: join('.agents', 'skills')")
		assert.throws(() => parseUpstream(registry(claude, computed)), /`cursor` has no literal skillsDir/)
	})

	it('fails when globalSkillsDir is missing', () => {
		const bare = cursor.replace(/\n {4}globalSkillsDir: .*,/, '')
		assert.throws(() => parseUpstream(registry(claude, bare)), /`cursor` has no globalSkillsDir/)
	})

	it('fails when the declared name disagrees with the key', () => {
		assert.throws(() => parseUpstream(registry(entry('cursor', '.agents/skills', 'undefined', 'kursor'))), ParseError)
	})
})

describe('normalizeGlobal', () => {
	it('joins string segments onto the base variable', () => {
		assert.equal(normalizeGlobal("join(home, '.agents', 'skills')"), '{home}/.agents/skills')
	})
})

describe('harness IDs', () => {
	it('loads the roster from the package source', async () => {
		const ids = await loadHarnessIds()
		assert.ok(ids.includes('claude-code'))
	})

	it('loads the recorded skill directories and leaves out unconfirmed harnesses', async () => {
		const directories = await loadSkillsDirectories(['claude-code', 'crush'])
		assert.deepEqual(Object.keys(directories), ['claude-code'])
		assert.deepEqual(directories['claude-code'].project, ['.claude/skills'])
	})

	it('rejects a roster of the wrong shape', () => {
		assert.throws(() => assertHarnessIds(undefined), ParseError)
		assert.throws(() => assertHarnessIds([]), ParseError)
		assert.throws(() => assertHarnessIds(['cursor', 3]), ParseError)
	})
})

describe('compare', () => {
	const dirs = (skillsDir, globalSkillsDir) => ({ skillsDir, globalSkillsDir })
	const baseline = {
		agents: {
			'claude-code': dirs('.claude/skills', '{claudeHome}/skills'),
			'github-copilot': dirs('.agents/skills', '{home}/.copilot/skills'),
			goose: dirs('.goose/skills', '{configHome}/goose/skills'),
			roo: dirs('.roo/skills', '{home}/.roo/skills'),
		},
	}

	it('reports nothing when upstream matches the baseline', () => {
		const upstream = structuredClone(baseline.agents)
		assert.deepEqual(compare({ upstream, baseline, harnessIds: ['claude-code', 'copilot-cli'] }), [])
	})

	it('reports new and removed agents', () => {
		const { roo: _, ...upstream } = structuredClone(baseline.agents)
		upstream.kiro = dirs('.kiro/skills', '{home}/.kiro/skills')
		const kinds = compare({ upstream, baseline, harnessIds: ['claude-code'] }).map((f) => [f.kind, f.agent])
		assert.deepEqual(kinds, [
			['new-agent', 'kiro'],
			['agent-removed', 'roo'],
		])
	})

	it('reports directory changes only for supported harnesses, under their upstream name', () => {
		const upstream = structuredClone(baseline.agents)
		upstream['github-copilot'] = dirs('.github/skills', '{home}/.github/skills')
		upstream.goose.skillsDir = '.agents/skills'
		const findings = compare({ upstream, baseline, harnessIds: ['claude-code', 'copilot-cli'] })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.agent, f.harness]),
			[
				['project-dir-changed', 'github-copilot', 'copilot-cli'],
				['global-dir-changed', 'github-copilot', 'copilot-cli'],
			],
		)
	})

	it('reports a change under github-copilot for both Copilot CLI and Copilot in VS Code', () => {
		const upstream = structuredClone(baseline.agents)
		upstream['github-copilot'].skillsDir = '.copilot/skills'
		const findings = compare({ upstream, baseline, harnessIds: ['copilot-cli', 'vscode-copilot'] })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.agent, f.harness]),
			[
				['project-dir-changed', 'github-copilot', 'copilot-cli'],
				['project-dir-changed', 'github-copilot', 'vscode-copilot'],
			],
		)
	})

	it('reports a supported harness upstream does not list', () => {
		const upstream = structuredClone(baseline.agents)
		const findings = compare({ upstream, baseline, harnessIds: ['claude-code', 'opencode'] })
		assert.deepEqual(
			findings.map((f) => [f.kind, f.harness]),
			[['supported-absent-upstream', 'opencode']],
		)
	})

	it('reports an upstream directory the recorded directories lack, for each harness under the agent', () => {
		const upstream = structuredClone(baseline.agents)
		const directories = {
			'claude-code': { project: ['.claude/skills'], user: ['.claude/skills'], research: ['E-CC-L1'] },
			'copilot-cli': { project: ['.github/skills'], user: ['.agents/skills'], research: ['E-COPILOT-S5'] },
			'vscode-copilot': { project: ['.agents/skills'], user: ['.copilot/skills'], research: ['E-VSC-P1'] },
		}
		const findings = compare({
			upstream,
			baseline,
			harnessIds: ['claude-code', 'copilot-cli', 'vscode-copilot'],
			directories,
		})
		assert.deepEqual(
			findings.map((f) => [f.kind, f.agent, f.harness]),
			[
				['project-dir-unrecorded', 'github-copilot', 'copilot-cli'],
				['global-dir-unrecorded', 'github-copilot', 'copilot-cli'],
			],
		)
		assert.match(findings[0].detail, /Upstream reads `\.agents\/skills`.*`\.github\/skills`.*`E-COPILOT-S5`/)
		assert.match(findings[1].detail, /Upstream reads `~\/\.copilot\/skills`/)
	})

	it('compares a global directory only under {home}', () => {
		const upstream = { 'claude-code': { skillsDir: '.claude/skills', globalSkillsDir: '{claudeHome}/skills' } }
		const directories = { 'claude-code': { project: ['.claude/skills'], user: [], research: ['E-CC-L1'] } }
		assert.deepEqual(
			compare({ upstream, baseline: { agents: upstream }, harnessIds: ['claude-code'], directories }),
			[],
		)
	})

	it('labels registry findings as corroboration, per axis, and states the blind spot', () => {
		const body = issueBody({
			findings: compare({
				upstream: { ...structuredClone(baseline.agents), kiro: dirs('.kiro/skills', null) },
				baseline,
				harnessIds: ['claude-code'],
			}),
			total: 5,
			harnessIds: ['claude-code'],
			sources: 2,
		})
		assert.match(
			body,
			/## Skills axis\n\n### Corroboration: `vercel-labs\/skills` registry[\s\S]*#### New agents upstream/,
		)
		assert.match(body, /## Instructions axis\n\nNo change\./)
		assert.match(body, /Neither\s+input covers detection variables, managed-policy locations, or plugin storage/)
		assert.match(body, /This check proposes; it does not decide\./)
	})

	it('names the evidence and flags a claim that was already weak', () => {
		const body = issueBody({
			findings: [
				{
					source: 'vendor',
					axis: 'instructions',
					kind: 'vendor-path-added',
					harness: 'kilo',
					evidence: 'E-KILO-I1',
					confidence: 'Medium — implied',
					url: 'https://kilo.ai/docs',
					detail: 'The docs now name `KILO.md`.',
				},
			],
			total: 5,
			harnessIds: ['kilo'],
			sources: 1,
		})
		assert.match(body, /## Skills axis\n\nNo change\./)
		assert.match(
			body,
			/## Instructions axis\n\n### Vendor docs name a new path\n\n- \*\*kilo\*\*: .*`E-KILO-I1` \(Medium\).*already only Medium confidence/,
		)
	})
})

describe('cli', () => {
	const dir = mkdtempSync(join(tmpdir(), 'harness-drift-'))
	const docs = join(dir, 'skills.md')
	const vendorBaseline = join(dir, 'vendor-baseline.json')
	const vendorSource = {
		harness: 'claude-code',
		axis: 'skills',
		evidence: 'E-CC-L1',
		confidence: 'High',
		cited: 'https://code.claude.com/docs/en/skills',
		url: pathToFileURL(docs).href,
		section: 'Where skills load',
		paths: ['.claude/skills', '~/.claude/skills'],
	}
	writeFileSync(docs, '## Where skills load\n\n`~/.claude/skills` and `.claude/skills`.\n')
	writeFileSync(vendorBaseline, JSON.stringify({ reviewed: 'x', sources: [vendorSource] }))
	// Every run reads the test's vendor baseline, so none fetches vendor pages or writes the real one.
	const run = (...args) =>
		spawnSync(process.execPath, [script, '--vendor-baseline', vendorBaseline, ...args], { encoding: 'utf8' })

	it('exits 2 when the upstream shape outruns the parser', () => {
		const upstream = join(dir, 'broken.ts')
		writeFileSync(upstream, registry(cursor.replace("skillsDir: '.agents/skills'", 'skillsDir: universalDir')))
		const result = run('--upstream-file', upstream)
		assert.equal(result.status, 2, result.stderr)
		assert.match(result.stderr, /has no literal skillsDir/)
	})

	it('exits 0 when upstream matches the baseline and 1 on drift', async () => {
		const harnessIds = await loadHarnessIds()
		const directories = await loadSkillsDirectories(harnessIds)
		const agents = new Map()
		for (const id of harnessIds) if (!agents.has(upstreamName(id))) agents.set(upstreamName(id), directories[id])
		const all = [...agents].map(([agent, recorded]) =>
			recorded
				? entry(agent, recorded.project[0], `join(home, '${recorded.user[0]}')`)
				: entry(agent, '.agents/skills', "join(home, 'skills')"),
		)
		const upstream = join(dir, 'agents.ts')
		const baseline = join(dir, 'baseline.json')
		writeFileSync(upstream, registry(...all))
		assert.equal(run('--upstream-file', upstream, '--baseline', baseline, '--update-baseline').status, 0)
		assert.equal(run('--upstream-file', upstream, '--baseline', baseline).status, 0)

		writeFileSync(upstream, registry(...all, entry('kiro', '.kiro/skills', 'undefined')))
		const drift = run('--upstream-file', upstream, '--baseline', baseline, '--json')
		assert.equal(drift.status, 1, drift.stderr)
		assert.deepEqual(
			JSON.parse(drift.stdout).findings.map((f) => f.kind),
			['new-agent'],
		)
	})

	it('exits 1 on vendor drift and 2 when a vendor page is restructured', async () => {
		const harnessIds = await loadHarnessIds()
		const agents = [...new Set(harnessIds.map(upstreamName))].map((agent) =>
			entry(agent, '.agents/skills', "join(home, 'skills')"),
		)
		const upstream = join(dir, 'vendor-agents.ts')
		const baseline = join(dir, 'vendor-registry-baseline.json')
		writeFileSync(upstream, registry(...agents))
		assert.equal(run('--upstream-file', upstream, '--baseline', baseline, '--update-baseline').status, 0)

		writeFileSync(docs, '## Where skills load\n\n`~/.claude/skills`, `.claude/skills`, and `.agents/skills`.\n')
		const drift = run('--upstream-file', upstream, '--baseline', baseline, '--json')
		assert.equal(drift.status, 1, drift.stderr)
		const vendor = JSON.parse(drift.stdout).findings.filter((f) => f.source === 'vendor')
		assert.deepEqual(
			vendor.map((f) => [f.kind, f.axis, f.path, f.evidence]),
			[['vendor-path-added', 'skills', '.agents/skills', 'E-CC-L1']],
		)

		writeFileSync(docs, '## Skill locations\n\n`.claude/skills`\n')
		const broken = run('--upstream-file', upstream, '--baseline', baseline)
		assert.equal(broken.status, 2, broken.stderr)
		assert.match(broken.stderr, /heading `Where skills load` not found/)
	})
})
