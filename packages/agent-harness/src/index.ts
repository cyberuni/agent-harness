/**
 * The AI agent harnesses this package knows how to identify.
 *
 * `unknown` is the only value `detectHarness()` currently returns — see the module
 * doc comment for why.
 */
export type HarnessId = 'claude-code' | 'cursor' | 'codex' | 'copilot-cli' | 'unknown'

/**
 * A single fact this package observed while trying to identify the running harness
 * (an env var it checked, a file it looked for). Once real detection lands, each
 * result carries the evidence that led to its conclusion, so a caller can see why.
 */
export interface HarnessEvidence {
	readonly description: string
}

export interface HarnessDetectionResult {
	readonly harness: HarnessId
	readonly evidence: readonly HarnessEvidence[]
}

/**
 * Detect which AI agent harness this process is running under.
 *
 * This is a stub. The detection rules — which env vars, files, or process trees
 * identify Claude Code, Cursor, Codex, or Copilot CLI — are not yet backed by
 * verified research (see `.research/harness-detection`), so this function makes no
 * claim it cannot support: it always reports `unknown` with no evidence.
 */
export function detectHarness(): HarnessDetectionResult {
	return { harness: 'unknown', evidence: [] }
}
