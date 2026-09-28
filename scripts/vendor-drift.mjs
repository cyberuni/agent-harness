/**
 * Vendor documentation drift.
 *
 * Each source in `vendor-baseline.json` names one vendor docs page, one heading on it, and one
 * axis: `skills` (where skills are discovered) or `instructions` (which instruction files are
 * read). The section under that heading is reduced to the paths it names, and those are compared
 * with the paths recorded when the section was last reviewed. A source whose paths do not reduce
 * well can instead set `"mode": "hash"`, which compares a hash of the section text.
 *
 * Every source also carries the evidence ID and confidence of the claim it backs in
 * `.research/harness-detection/evidence.md`, so a finding can say how solid the claim already was.
 *
 * A page that cannot be read the same way as before is an `ExtractionError`, never a clean result:
 * a missing heading, an empty section, or a section that names no paths.
 */

import { createHash } from 'node:crypto'

export const AXES = ['skills', 'instructions']

export class ExtractionError extends Error {}

/**
 * Paths a section can name, per axis. Both accept a `~/` or `$HOME/` prefix for user scope.
 *
 * Skills: a dot-directory path ending in `skills`, such as `.claude/skills` or
 * `~/.config/opencode/skills`.
 * Instructions: an upper-case markdown file (`AGENTS.md`, `CLAUDE.md`), an `instructions.md` file,
 * a harness dotfile (`.cursorrules`, `.clinerules`), any of them under a path that starts with a
 * dot-directory (`~/.config/opencode/AGENTS.md`), or a `rules` or `instructions` directory under one
 * (`.cursor/rules`, `.github/instructions`).
 */
const PATTERNS = {
	skills: /(?<![\w.-])(?:~\/|\$HOME\/)?\.[\w-]+(?:\/[\w.-]+)*?\/skills(?![\w-])/g,
	instructions:
		/(?<![\w.-])(?:~\/|\$HOME\/)?(?:(?:\.[\w-]+\/(?:[\w.-]+\/)*)?(?:[A-Z][A-Z0-9_-]*(?:\.[a-z]+)?\.md|[\w*-]*\.?instructions\.md|\.cursorrules|\.clinerules|\.windsurfrules|\.augment-guidelines)|\.[\w-]+\/(?:[\w.-]+\/)*(?:rules|instructions))(?![\w-])/g,
}

/** Normalizes a matched path: `$HOME/` becomes `~/`. */
function normalizePath(path) {
	return path.replace(/^\$HOME\//, '~/')
}

/**
 * The text under the first markdown heading containing `heading`, up to the next heading of the
 * same or a higher level. Headings inside fenced code blocks are ignored.
 */
export function section(markdown, heading) {
	const lines = markdown.split(/\r?\n/)
	let fenced = false
	let start = -1
	let level = 0
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]
		if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
		if (fenced) continue
		const match = line.match(/^(#{1,6})\s+(.*)$/)
		if (!match) continue
		if (start === -1) {
			if (match[2].includes(heading)) {
				start = index
				level = match[1].length
			}
		} else if (match[1].length <= level) {
			return lines.slice(start, index).join('\n')
		}
	}
	if (start === -1) throw new ExtractionError(`heading \`${heading}\` not found`)
	return lines.slice(start).join('\n')
}

/** The distinct paths a section names on an axis, sorted. */
export function extractPaths(text, axis) {
	const pattern = PATTERNS[axis]
	if (!pattern) throw new ExtractionError(`unknown axis \`${axis}\``)
	return [...new Set([...text.matchAll(pattern)].map((match) => normalizePath(match[0])))].sort()
}

export function hashText(text) {
	return createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex')
}

/**
 * Reads one source's section from its fetched page and reduces it to what the baseline records:
 * `paths`, or `hash` in hash mode. Throws `ExtractionError` when the page no longer reads as it
 * did.
 */
export function readSource(source, page) {
	const where = `${source.harness} ${source.axis} (${source.url})`
	let text
	try {
		text = section(page, source.section)
	} catch (error) {
		if (error instanceof ExtractionError) throw new ExtractionError(`${where}: ${error.message}`)
		throw error
	}
	if (text.split('\n').slice(1).join('\n').trim() === '')
		throw new ExtractionError(`${where}: section \`${source.section}\` is empty`)
	if (source.mode === 'hash') return { hash: hashText(text) }
	const paths = extractPaths(text, source.axis)
	if (paths.length === 0)
		throw new ExtractionError(`${where}: section \`${source.section}\` names no ${source.axis} paths`)
	return { paths }
}

/** Validates the baseline's shape, so a malformed entry fails rather than being skipped. */
export function assertVendorBaseline(baseline) {
	if (!Array.isArray(baseline?.sources) || baseline.sources.length === 0)
		throw new ExtractionError('vendor baseline has no `sources`')
	for (const source of baseline.sources) {
		const label = `${source.harness ?? '?'} ${source.axis ?? '?'}`
		for (const field of ['harness', 'axis', 'evidence', 'confidence', 'cited', 'url', 'section'])
			if (typeof source[field] !== 'string' || source[field] === '')
				throw new ExtractionError(`vendor source ${label} has no \`${field}\``)
		if (!AXES.includes(source.axis)) throw new ExtractionError(`vendor source ${label} has unknown axis`)
		if (source.mode === 'hash' ? typeof source.hash !== 'string' : !Array.isArray(source.paths))
			throw new ExtractionError(`vendor source ${label} has no recorded ${source.mode === 'hash' ? 'hash' : 'paths'}`)
	}
	return baseline
}

/**
 * Compares what each source reads now with what was reviewed, and checks each recorded skills
 * directory is still named by a skills source for its harness.
 *
 * `readings` maps a source's index in `baseline.sources` to the result of `readSource`.
 */
export function compareVendor({ baseline, readings, directories = {} }) {
	const findings = []
	baseline.sources.forEach((source, index) => {
		const reading = readings[index]
		const base = {
			source: 'vendor',
			axis: source.axis,
			harness: source.harness,
			evidence: source.evidence,
			confidence: source.confidence,
			url: source.cited,
		}
		if (source.mode === 'hash') {
			if (reading.hash !== source.hash)
				findings.push({
					...base,
					kind: 'vendor-section-changed',
					detail: `The \`${source.section}\` section changed.`,
				})
			return
		}
		for (const path of reading.paths)
			if (!source.paths.includes(path))
				findings.push({ ...base, kind: 'vendor-path-added', path, detail: `The docs now name \`${path}\`.` })
		for (const path of source.paths)
			if (!reading.paths.includes(path))
				findings.push({ ...base, kind: 'vendor-path-removed', path, detail: `The docs no longer name \`${path}\`.` })
	})

	for (const [harness, recorded] of Object.entries(directories)) {
		const indexes = baseline.sources
			.map((source, index) => ({ source, index }))
			.filter(({ source }) => source.harness === harness && source.axis === 'skills' && source.mode !== 'hash')
		if (indexes.length === 0) continue
		const named = new Set(indexes.flatMap(({ index }) => readings[index].paths))
		const missing = [
			...recorded.project.filter((dir) => !named.has(dir)),
			...recorded.user.filter((dir) => !named.has(`~/${dir}`)).map((dir) => `~/${dir}`),
		]
		for (const path of missing)
			findings.push({
				source: 'vendor',
				axis: 'skills',
				harness,
				evidence: recorded.research.join(', '),
				confidence: indexes[0].source.confidence,
				url: indexes[0].source.cited,
				kind: 'recorded-dir-undocumented',
				path,
				detail: `\`skillsDirectories()\` records \`${path}\`, but the vendor docs no longer name it.`,
			})
	}
	return findings
}

/** The baseline with each source's recorded paths or hash replaced by what it reads now. */
export function acceptVendor(baseline, readings, reviewed) {
	return {
		...baseline,
		reviewed,
		sources: baseline.sources.map((source, index) =>
			source.mode === 'hash' ? { ...source, hash: readings[index].hash } : { ...source, paths: readings[index].paths },
		),
	}
}

/** Fetches each distinct URL once and reads every source. Any failure throws. */
export async function readSources(baseline, fetchText) {
	const pages = new Map()
	const readings = {}
	for (const [index, source] of baseline.sources.entries()) {
		if (!pages.has(source.url)) {
			try {
				pages.set(source.url, await fetchText(source.url))
			} catch (error) {
				throw new ExtractionError(`could not fetch ${source.url}: ${error.message}`)
			}
		}
		readings[index] = readSource(source, pages.get(source.url))
	}
	return readings
}
