import type { HarnessId } from '../harness/harness-id.js'

/**
 * Whether a harness lets a plugin declare other plugins it depends on. Only Claude Code does, via
 * `dependencies` in `plugin.json` (E-CC-X1); Cursor, Codex, and Copilot CLI manifests have no such
 * field (E-CUR-X1, E-CODEX-X1, E-COPILOT-X1).
 */
export function supportsPluginDependencies(harness: HarnessId): boolean {
	return harness === 'claude-code'
}
