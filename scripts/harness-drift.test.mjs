import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
	assertHarnessIds,
	compare,
	issueBody,
	loadHarnessIds,
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

	it('states the blind spot in the issue body', () => {
		const body = issueBody({
			findings: [{ kind: 'new-agent', agent: 'kiro', detail: 'x' }],
			total: 5,
			harnessIds: ['claude-code'],
		})
		assert.match(body, /## New agents upstream/)
		assert.match(body, /no\s+detection variables, managed-policy locations, or plugin storage/)
	})
})

describe('cli', () => {
	const dir = mkdtempSync(join(tmpdir(), 'harness-drift-'))
	const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })

	it('exits 2 when the upstream shape outruns the parser', () => {
		const upstream = join(dir, 'broken.ts')
		writeFileSync(upstream, registry(cursor.replace("skillsDir: '.agents/skills'", 'skillsDir: universalDir')))
		const result = run('--upstream-file', upstream)
		assert.equal(result.status, 2, result.stderr)
		assert.match(result.stderr, /has no literal skillsDir/)
	})

	it('exits 0 when upstream matches the baseline and 1 on drift', async () => {
		const ids = [...new Set((await loadHarnessIds()).map(upstreamName))]
		const all = ids.map((id) => entry(id, '.agents/skills', "join(home, 'skills')"))
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
})
