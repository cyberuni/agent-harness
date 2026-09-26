import { describe, expect, it } from 'vitest'

import { detectHarness } from './detect-harness.js'

describe('detectHarness', () => {
	it('detects Claude Code from a tool or hook subprocess', () => {
		const result = detectHarness({ env: { CLAUDECODE: '1', CLAUDE_CODE_CHILD_SESSION: '1' } })

		expect(result.harness).toBe('claude-code')
		expect(result.evidence.map((e) => e.signal)).toEqual(['CLAUDECODE', 'CLAUDE_CODE_CHILD_SESSION'])
	})

	it('detects Claude Code from a stdio MCP server, which gets a session id but no child-session flag', () => {
		const result = detectHarness({ env: { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'abc' } })

		expect(result.harness).toBe('claude-code')
	})

	it('detects Cursor from a terminal command its agent runs', () => {
		const result = detectHarness({ env: { CURSOR_AGENT: '1' } })

		expect(result.harness).toBe('cursor')
		expect(result.evidence).toEqual([expect.objectContaining({ harness: 'cursor', signal: 'CURSOR_AGENT' })])
	})

	it('detects Cursor from a hook command', () => {
		const result = detectHarness({
			env: { CURSOR_VERSION: '2.0.0', CURSOR_PROJECT_DIR: '/repo', CLAUDE_PROJECT_DIR: '/repo' },
		})

		expect(result.harness).toBe('cursor')
	})

	it('detects Codex from a shell tool command', () => {
		const result = detectHarness({ env: { CODEX_THREAD_ID: 't-1', CODEX_CI: '1' } })

		expect(result.harness).toBe('codex')
		expect(result.evidence.map((e) => e.signal)).toEqual(['CODEX_THREAD_ID'])
	})

	it('detects Copilot CLI from a shell command', () => {
		const result = detectHarness({ env: { COPILOT_CLI: '1', COPILOT_AGENT_SESSION_ID: 's-1' } })

		expect(result.harness).toBe('copilot-cli')
		expect(result.evidence.map((e) => e.signal)).toEqual(['COPILOT_CLI', 'COPILOT_AGENT_SESSION_ID'])
	})

	it('detects Copilot CLI from an MCP server, which gets the session id', () => {
		expect(detectHarness({ env: { COPILOT_AGENT_SESSION_ID: 's-1' } }).harness).toBe('copilot-cli')
	})

	it('detects Copilot CLI from a plugin hook', () => {
		const env = { COPILOT_PLUGIN_ROOT: '/p', PLUGIN_ROOT: '/p', CLAUDE_PLUGIN_ROOT: '/p' }

		expect(detectHarness({ env }).harness).toBe('copilot-cli')
	})

	it('reports unknown for plugin-root aliases, which Codex and Copilot CLI also hand to hooks', () => {
		const result = detectHarness({
			env: { CLAUDE_PLUGIN_ROOT: '/p', CLAUDE_PLUGIN_DATA: '/d', PLUGIN_ROOT: '/p', PLUGIN_DATA: '/d' },
		})

		expect(result).toEqual({ harness: 'unknown', evidence: [], candidates: [] })
	})

	it('reports unknown with both candidates when one harness runs inside another', () => {
		const result = detectHarness({
			env: { CLAUDECODE: '1', CLAUDE_CODE_CHILD_SESSION: '1', CODEX_THREAD_ID: 't-1' },
		})

		expect(result.harness).toBe('unknown')
		expect(result.candidates).toEqual(['claude-code', 'codex'])
		expect(result.evidence.map((e) => e.harness)).toEqual(['claude-code', 'claude-code', 'codex'])
	})

	it('reports unknown with no evidence when no harness signal is set', () => {
		expect(detectHarness({ env: { PATH: '/usr/bin', TERM_PROGRAM: 'vscode' } })).toEqual({
			harness: 'unknown',
			evidence: [],
			candidates: [],
		})
	})

	it('ignores a signal set to an unexpected value', () => {
		expect(detectHarness({ env: { CURSOR_AGENT: '0', COPILOT_CLI: '' } }).harness).toBe('unknown')
	})

	it('reports unknown for CLAUDECODE alone, which IDE extensions also set in integrated terminals', () => {
		const result = detectHarness({ env: { CLAUDECODE: '1' } })

		expect(result.harness).toBe('unknown')
		expect(result.candidates).toEqual([])
		expect(result.evidence.map((e) => e.signal)).toEqual(['CLAUDECODE'])
	})
})
