import type { HarnessId } from '../harness/harness-id.js'

/**
 * One environment variable `detectHarness()` found set, and which harness it points to.
 */
export interface HarnessEvidence {
	readonly harness: HarnessId
	/** The environment variable name. */
	readonly signal: string
	readonly description: string
	/** The claim ID in `.research/harness-detection/evidence.md` that backs this signal. */
	readonly research: string
}

export interface HarnessDetectionResult {
	/** The detected harness, or `unknown` when no harness or more than one harness matched. */
	readonly harness: HarnessId | 'unknown'
	/** Every signal that was found set, including ones that did not settle the answer. */
	readonly evidence: readonly HarnessEvidence[]
	/**
	 * Harnesses whose signals were found. More than one means nested harnesses (one launched from
	 * another's shell inherits its variables), which the environment cannot order, so `harness` is
	 * `unknown`.
	 */
	readonly candidates: readonly HarnessId[]
}

export interface DetectHarnessOptions {
	/** The environment to inspect. Defaults to `process.env`. */
	readonly env?: Readonly<Record<string, string | undefined>>
}

interface Signal {
	readonly name: string
	readonly matches: (value: string) => boolean
	readonly description: string
	readonly research: string
}

/**
 * A harness is detected when every signal in any one of its rules is set.
 * See `.research/harness-detection/conclusion.md` (R1) for why each rule is shaped as it is.
 */
interface DetectionRule {
	readonly harness: HarnessId
	readonly all: readonly Signal[]
}

const isOne = (value: string) => value === '1'
const isSet = (value: string) => value !== ''

const claudeCode: Signal = {
	name: 'CLAUDECODE',
	matches: isOne,
	description:
		'Claude Code sets CLAUDECODE=1 in subprocesses it spawns; IDE extensions also set it in integrated terminals',
	research: 'E-CC-D1',
}

const rules: readonly DetectionRule[] = [
	{
		harness: 'claude-code',
		all: [
			claudeCode,
			{
				name: 'CLAUDE_CODE_CHILD_SESSION',
				matches: isOne,
				description: 'Claude Code sets CLAUDE_CODE_CHILD_SESSION=1 for tool, hook, and status line subprocesses',
				research: 'E-CC-D3',
			},
		],
	},
	{
		harness: 'claude-code',
		all: [
			claudeCode,
			{
				name: 'CLAUDE_CODE_SESSION_ID',
				matches: isSet,
				description: 'Claude Code sets CLAUDE_CODE_SESSION_ID in tool, hook, and stdio MCP server subprocesses',
				research: 'E-CC-D6',
			},
		],
	},
	{
		harness: 'cursor',
		all: [
			{
				name: 'CURSOR_AGENT',
				matches: isOne,
				description: 'Cursor sets CURSOR_AGENT=1 on terminal commands its agent runs',
				research: 'E-CUR-D1',
			},
		],
	},
	{
		harness: 'cursor',
		all: [
			{
				name: 'CURSOR_VERSION',
				matches: isSet,
				description: 'Cursor sets CURSOR_VERSION for hook commands',
				research: 'E-CUR-D10',
			},
			{
				name: 'CURSOR_PROJECT_DIR',
				matches: isSet,
				description: 'Cursor sets CURSOR_PROJECT_DIR for hook commands',
				research: 'E-CUR-D10',
			},
		],
	},
	{
		harness: 'codex',
		all: [
			{
				name: 'CODEX_THREAD_ID',
				matches: isSet,
				description:
					'Codex injects CODEX_THREAD_ID into shell tool commands, even under a restrictive shell env policy',
				research: 'E-CODEX-D2',
			},
		],
	},
	{
		harness: 'copilot-cli',
		all: [
			{
				name: 'COPILOT_CLI',
				matches: isOne,
				description: 'Copilot CLI sets COPILOT_CLI=1 in its subprocesses',
				research: 'E-COPILOT-D1',
			},
		],
	},
	{
		harness: 'copilot-cli',
		all: [
			{
				name: 'COPILOT_AGENT_SESSION_ID',
				matches: isSet,
				description: 'Copilot CLI passes COPILOT_AGENT_SESSION_ID to shell commands and MCP servers',
				research: 'E-COPILOT-D2',
			},
		],
	},
	{
		harness: 'copilot-cli',
		all: [
			{
				name: 'COPILOT_PLUGIN_ROOT',
				matches: isSet,
				description: 'Copilot CLI passes COPILOT_PLUGIN_ROOT to plugin hooks',
				research: 'E-COPILOT-D6',
			},
		],
	},
]

/**
 * Detect which AI agent harness this process is running under, from its environment.
 *
 * Reports `unknown` rather than guessing: when no rule matches, and when rules for more than one
 * harness match.
 */
export function detectHarness(options: DetectHarnessOptions = {}): HarnessDetectionResult {
	const env = options.env ?? process.env
	const evidence: HarnessEvidence[] = []
	const candidates: HarnessId[] = []

	for (const rule of rules) {
		const found = rule.all.filter((signal) => {
			const value = env[signal.name]
			return value !== undefined && signal.matches(value)
		})
		for (const signal of found) {
			if (!evidence.some((e) => e.harness === rule.harness && e.signal === signal.name)) {
				evidence.push({
					harness: rule.harness,
					signal: signal.name,
					description: signal.description,
					research: signal.research,
				})
			}
		}
		if (found.length === rule.all.length && !candidates.includes(rule.harness)) {
			candidates.push(rule.harness)
		}
	}

	const harness = candidates.length === 1 ? (candidates[0] as HarnessId) : 'unknown'
	return { harness, evidence, candidates }
}
