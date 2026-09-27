#!/usr/bin/env node
/**
 * Harness drift detector.
 *
 * Compares the `vercel-labs/skills` agent registry against a reviewed baseline and against the
 * harnesses this package supports. Upstream records only skills directories, so a clean run says
 * nothing about detection variables, managed-policy locations, or plugin storage.
 *
 * Usage:
 *   node scripts/harness-drift.mjs                   # human-readable report
 *   node scripts/harness-drift.mjs --json            # machine-readable report
 *   node scripts/harness-drift.mjs --issue-body      # markdown for a GitHub issue
 *   node scripts/harness-drift.mjs --update-baseline # accept current upstream as reviewed
 *   --upstream-file <path>                           # read upstream from disk instead of fetching
 *   --baseline <path>                                # use another baseline file
 *
 * Exits 1 when drift is found, 0 when clean, 2 on a fetch or parse failure.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const defaultBaselinePath = join(here, 'harness-baseline.json')
const harnessIdPath = join(root, 'packages', 'agent-harness', 'src', 'harness', 'harness-id.ts')

export const UPSTREAM = 'https://raw.githubusercontent.com/vercel-labs/skills/main/src/agents.ts'

/** A registry entry upstream uses for its shared-directory target, not an agent. */
const PSEUDO_AGENTS = new Set(['universal'])

/**
 * Upstream names a harness differently from `HarnessId` only where listed. Upstream's
 * `github-copilot` covers both Copilot CLI and VS Code's agent mode, so its directories are the
 * closest record of Copilot CLI's. An ID absent here is looked up under its own name.
 */
export const UPSTREAM_NAMES = { 'copilot-cli': 'github-copilot' }

export class ParseError extends Error {}

/**
 * Reads `skillsDir` and `globalSkillsDir` per agent out of the upstream `agents` object literal.
 *
 * Throws rather than returning a partial map: a parser that silently drops entries would report
 * them as removed, and one that drops a field would report agreement it never checked. The entry
 * count is cross-checked against the closing braces, an independent read of the same literal.
 */
export function parseUpstream(source) {
	const start = source.indexOf('export const agents')
	if (start === -1) throw new ParseError('could not find `export const agents`')
	const end = source.indexOf('\n};', start)
	if (end === -1) throw new ParseError('could not find the end of the `agents` object literal')
	const literal = source.slice(start, end)

	const keys = [...literal.matchAll(/^ {2}'?([A-Za-z0-9_.-]+)'?: \{$/gm)]
	const closings = (literal.match(/^ {2}\},?$/gm) ?? []).length
	if (keys.length === 0) throw new ParseError('parsed zero agents')
	if (keys.length !== closings) throw new ParseError(`found ${keys.length} agent keys but ${closings} entry closings`)

	const agents = {}
	keys.forEach((key, index) => {
		const name = key[1]
		const entry = literal.slice(key.index, keys[index + 1]?.index ?? literal.length)
		const declared = entry.match(/^ {4}name: '([^']+)',$/m)?.[1]
		if (declared !== name) throw new ParseError(`entry \`${name}\` declares name \`${declared ?? '(none)'}\``)
		const skillsDir = entry.match(/^ {4}skillsDir: '([^']+)',$/m)?.[1]
		if (skillsDir === undefined) throw new ParseError(`entry \`${name}\` has no literal skillsDir`)
		const globalSkillsDir = entry.match(/^ {4}globalSkillsDir: (.+),$/m)?.[1]
		if (globalSkillsDir === undefined) throw new ParseError(`entry \`${name}\` has no globalSkillsDir`)
		if (PSEUDO_AGENTS.has(name)) return
		agents[name] = { skillsDir, globalSkillsDir: normalizeGlobal(globalSkillsDir) }
	})
	return agents
}

/**
 * `join(home, '.claude', 'skills')` becomes `{home}/.claude/skills`, keeping the base variable so a
 * move from `home` to `configHome` still shows. Any other expression is kept verbatim.
 */
export function normalizeGlobal(expression) {
	if (expression === 'undefined') return null
	const join = expression.match(/^join\(([A-Za-z_$][\w$]*)((?:,\s*'[^']*')*)\)$/)
	if (!join) return expression
	const segments = [...join[2].matchAll(/'([^']*)'/g)].map((segment) => segment[1])
	return [`{${join[1]}}`, ...segments].join('/')
}

/** Validates the harness IDs this package supports, whatever shape they were read from. */
export function assertHarnessIds(ids) {
	if (!Array.isArray(ids)) throw new ParseError('`harnessIds` is not an array')
	if (ids.length === 0) throw new ParseError('`harnessIds` is empty')
	const bad = ids.filter((id) => typeof id !== 'string' || id.length === 0)
	if (bad.length) throw new ParseError(`\`harnessIds\` holds non-string entries: ${JSON.stringify(bad)}`)
	return ids
}

/**
 * Imports the roster from source rather than parsing it, so new harnesses land here with no change
 * to this script. The package holds no skills directories, so the roster is all it compares.
 */
export async function loadHarnessIds(path = harnessIdPath) {
	let module
	try {
		module = await import(pathToFileURL(path).href)
	} catch (error) {
		throw new ParseError(`could not import ${path}: ${error.message}`)
	}
	return assertHarnessIds(module.harnessIds)
}

export function upstreamName(id) {
	return UPSTREAM_NAMES[id] ?? id
}

export function compare({ upstream, baseline, harnessIds }) {
	const findings = []
	const supported = new Map(harnessIds.map((id) => [upstreamName(id), id]))

	for (const [agent, dirs] of Object.entries(upstream)) {
		const previous = baseline.agents[agent]
		if (previous === undefined) {
			findings.push({
				kind: 'new-agent',
				agent,
				detail: `New upstream agent with skillsDir \`${dirs.skillsDir}\`. A support candidate.`,
			})
			continue
		}
		const harness = supported.get(agent)
		if (harness === undefined) continue
		if (previous.skillsDir !== dirs.skillsDir)
			findings.push({
				kind: 'project-dir-changed',
				agent,
				harness,
				detail: `skillsDir changed from \`${previous.skillsDir}\` to \`${dirs.skillsDir}\`.`,
			})
		if (previous.globalSkillsDir !== dirs.globalSkillsDir)
			findings.push({
				kind: 'global-dir-changed',
				agent,
				harness,
				detail: `globalSkillsDir changed from \`${previous.globalSkillsDir}\` to \`${dirs.globalSkillsDir}\`.`,
			})
	}

	for (const agent of Object.keys(baseline.agents)) {
		if (upstream[agent] === undefined)
			findings.push({ kind: 'agent-removed', agent, detail: 'Present in baseline, absent upstream.' })
	}

	for (const [agent, harness] of supported) {
		if (upstream[agent] === undefined)
			findings.push({
				kind: 'supported-absent-upstream',
				agent,
				harness,
				detail: `\`${harness}\` is supported here but upstream has no \`${agent}\` entry. Check whether it was renamed, or add it to \`UPSTREAM_NAMES\`.`,
			})
	}

	return findings
}

const TITLES = {
	'new-agent': 'New agents upstream',
	'agent-removed': 'Agents removed upstream',
	'project-dir-changed': 'Project skills directory changed for a supported harness',
	'global-dir-changed': 'Global skills directory changed for a supported harness',
	'supported-absent-upstream': 'Supported harness missing upstream',
}

export function issueBody({ findings, total, harnessIds }) {
	const groups = findings.reduce((acc, finding) => {
		;(acc[finding.kind] ??= []).push(finding)
		return acc
	}, {})
	return [
		`The [\`vercel-labs/skills\`](${UPSTREAM}) agent registry has drifted from our reviewed baseline.`,
		'',
		`Upstream now lists **${total}** agents. This package supports **${harnessIds.length}**: ${harnessIds.map((id) => `\`${id}\``).join(', ')}.`,
		'',
		...Object.entries(groups).flatMap(([kind, items]) => [
			`## ${TITLES[kind] ?? kind}`,
			'',
			...items.map((item) => `- **${item.agent}**${item.harness ? ` (\`${item.harness}\`)` : ''}: ${item.detail}`),
			'',
		]),
		'## What this does and does not tell you',
		'',
		'Upstream records a project and a global skills directory per agent, and nothing else. It has no',
		'detection variables, managed-policy locations, or plugin storage, so a clean run does not mean',
		'those facts are current.',
		'',
		'This package holds no skills directories of its own, so the check compares the harness roster',
		'against upstream and tracks directory changes for supported harnesses against the baseline only.',
		'',
		'## Next',
		'',
		'Research each finding against primary vendor documentation, record the outcome in',
		'`.research/harness-detection/`, then accept the new upstream state with',
		'`node scripts/harness-drift.mjs --update-baseline`.',
		'',
	].join('\n')
}

function option(args, name) {
	const index = args.indexOf(name)
	return index === -1 ? undefined : args[index + 1]
}

async function readUpstream(args) {
	const file = option(args, '--upstream-file')
	if (file) return readFileSync(resolve(file), 'utf8')
	const response = await fetch(UPSTREAM)
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	return response.text()
}

function fail(message) {
	process.stderr.write(`error: ${message}\n`)
	process.exit(2)
}

async function main() {
	const args = process.argv.slice(2)
	const baselinePath = resolve(option(args, '--baseline') ?? defaultBaselinePath)

	let source
	try {
		source = await readUpstream(args)
	} catch (error) {
		fail(`could not fetch upstream registry: ${error.message}`)
	}

	let upstream
	let harnessIds
	try {
		upstream = parseUpstream(source)
		harnessIds = await loadHarnessIds()
	} catch (error) {
		if (error instanceof ParseError) fail(`${error.message}; the source layout probably changed.`)
		throw error
	}

	if (args.includes('--update-baseline')) {
		const next = { source: UPSTREAM, reviewed: new Date().toISOString().slice(0, 10), agents: upstream }
		writeFileSync(baselinePath, `${JSON.stringify(next, null, '\t')}\n`)
		process.stdout.write(`Baseline updated: ${Object.keys(upstream).length} agents.\n`)
		return
	}

	const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
	const findings = compare({ upstream, baseline, harnessIds })
	const total = Object.keys(upstream).length

	if (args.includes('--json')) {
		process.stdout.write(`${JSON.stringify({ agents: total, supported: harnessIds, findings }, null, 2)}\n`)
	} else if (args.includes('--issue-body')) {
		process.stdout.write(issueBody({ findings, total, harnessIds }))
	} else {
		process.stdout.write(
			findings.length
				? `${findings.length} finding(s):\n${findings.map((f) => `- [${f.kind}] ${f.agent}: ${f.detail}`).join('\n')}\n`
				: `No drift. ${total} upstream agents; supported harnesses: ${harnessIds.join(', ')}.\n`,
		)
	}

	process.exit(findings.length ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
