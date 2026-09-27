import { describe, expect, it } from 'vitest'

import { managedPolicyLocations } from './managed-policy-locations.js'

const localPaths = (locations: ReturnType<typeof managedPolicyLocations>) =>
	locations.filter((l) => l.kind === 'file' || l.kind === 'directory').map((l) => l.location)

describe('managedPolicyLocations', () => {
	it('lists Claude Code managed settings files on Linux', () => {
		expect(localPaths(managedPolicyLocations('claude-code', { platform: 'linux' }))).toEqual([
			'/etc/claude-code/managed-settings.json',
			'/etc/claude-code/managed-settings.d',
			'/etc/claude-code/managed-mcp.json',
		])
	})

	it('lists Claude Code MDM and file locations on macOS, after the server-managed source', () => {
		const locations = managedPolicyLocations('claude-code', { platform: 'darwin' })

		expect(locations.map((l) => [l.kind, l.location])).toEqual([
			['server', 'claude.ai admin console or a self-hosted Claude apps gateway'],
			['macos-managed-preferences', 'com.anthropic.claudecode'],
			['file', '/Library/Application Support/ClaudeCode/managed-settings.json'],
			['directory', '/Library/Application Support/ClaudeCode/managed-settings.d'],
			['file', '/Library/Application Support/ClaudeCode/managed-mcp.json'],
		])
	})

	it('lists Claude Code registry keys and files on Windows, not the legacy ProgramData path', () => {
		const locations = managedPolicyLocations('claude-code', { platform: 'win32' })

		expect(locations.map((l) => [l.kind, l.location])).toEqual([
			['server', 'claude.ai admin console or a self-hosted Claude apps gateway'],
			['windows-registry', 'HKLM\\SOFTWARE\\Policies\\ClaudeCode'],
			['file', 'C:\\Program Files\\ClaudeCode\\managed-settings.json'],
			['directory', 'C:\\Program Files\\ClaudeCode\\managed-settings.d'],
			['file', 'C:\\Program Files\\ClaudeCode\\managed-mcp.json'],
			['windows-registry', 'HKCU\\SOFTWARE\\Policies\\ClaudeCode'],
		])
	})

	it('lists Cursor enterprise hook files per OS, and its dashboard as server-side', () => {
		expect(localPaths(managedPolicyLocations('cursor', { platform: 'linux' }))).toEqual(['/etc/cursor/hooks.json'])
		expect(localPaths(managedPolicyLocations('cursor', { platform: 'darwin' }))).toEqual([
			'/Library/Application Support/Cursor/hooks.json',
		])
		expect(localPaths(managedPolicyLocations('cursor', { platform: 'win32' }))).toEqual([
			'C:\\ProgramData\\Cursor\\hooks.json',
		])
		expect(managedPolicyLocations('cursor', { platform: 'linux' }).map((l) => l.kind)).toContain('server')
	})

	it('lists Codex requirements and managed config under /etc/codex on Linux and macOS', () => {
		const paths = ['/etc/codex/requirements.toml', '/etc/codex/managed_config.toml', '/etc/codex/config.toml']
		expect(localPaths(managedPolicyLocations('codex', { platform: 'linux' }))).toEqual(paths)
		expect(localPaths(managedPolicyLocations('codex', { platform: 'darwin' }))).toEqual(paths)
		expect(
			managedPolicyLocations('codex', { platform: 'darwin' }).filter((l) => l.kind === 'macos-managed-preferences'),
		).toEqual([expect.objectContaining({ location: 'com.openai.codex' })])
	})

	it('lists Codex requirements under %ProgramData% on Windows', () => {
		expect(
			localPaths(managedPolicyLocations('codex', { platform: 'win32', env: { ProgramData: 'D:\\Data' } })),
		).toEqual(['D:\\Data\\OpenAI\\Codex\\requirements.toml'])
		expect(localPaths(managedPolicyLocations('codex', { platform: 'win32', env: {} }))).toEqual([
			'C:\\ProgramData\\OpenAI\\Codex\\requirements.toml',
		])
	})

	it('lists Copilot CLI MDM, server, and file sources in their documented precedence', () => {
		expect(managedPolicyLocations('copilot-cli', { platform: 'darwin' }).map((l) => [l.kind, l.location])).toEqual([
			['macos-managed-preferences', 'com.github.copilot'],
			['server', "copilot/managed-settings.json in the enterprise's .github-private repository"],
			['file', '/Library/Application Support/GitHubCopilot/managed-settings.json'],
		])
		expect(localPaths(managedPolicyLocations('copilot-cli', { platform: 'linux' }))).toEqual([
			'/etc/github-copilot/managed-settings.json',
		])
		expect(
			managedPolicyLocations('copilot-cli', { platform: 'win32', env: { ProgramFiles: 'C:\\PF' } }).map(
				(l) => l.location,
			),
		).toEqual([
			'HKLM\\SOFTWARE\\Policies\\GitHubCopilot',
			"copilot/managed-settings.json in the enterprise's .github-private repository",
			'C:\\PF\\GitHubCopilot\\managed-settings.json',
		])
	})
})
