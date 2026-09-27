import { describe, expect, it } from 'vitest'

import { pluginStorage } from './plugin-storage.js'

const pathsOf = (storage: ReturnType<typeof pluginStorage>) => storage.locations.map((l) => [l.kind, l.path])

describe('pluginStorage', () => {
	it('places Claude Code plugins under ~/.claude/plugins', () => {
		const storage = pluginStorage('claude-code', { homedir: '/home/u', env: {} })

		expect(storage.configDir).toBe('/home/u/.claude')
		expect(pathsOf(storage)).toEqual([
			['plugin-cache', '/home/u/.claude/plugins/cache'],
			['marketplaces', '/home/u/.claude/plugins/marketplaces'],
			['install-record', '/home/u/.claude/plugins/installed_plugins.json'],
			['enabled-record', '/home/u/.claude/settings.json'],
		])
	})

	it('follows CLAUDE_CONFIG_DIR', () => {
		const storage = pluginStorage('claude-code', { homedir: '/home/u', env: { CLAUDE_CONFIG_DIR: '/cfg' } })

		expect(storage.configDir).toBe('/cfg')
		expect(storage.locations[0]?.path).toBe('/cfg/plugins/cache')
	})

	it('places Codex plugins under $CODEX_HOME, defaulting to ~/.codex', () => {
		expect(pathsOf(pluginStorage('codex', { homedir: '/home/u', env: {} }))).toEqual([
			['plugin-cache', '/home/u/.codex/plugins/cache'],
			['enabled-record', '/home/u/.codex/config.toml'],
		])
		expect(pluginStorage('codex', { homedir: '/home/u', env: { CODEX_HOME: '/x' } }).configDir).toBe('/x')
	})

	it('places Copilot CLI plugins under $COPILOT_HOME, defaulting to ~/.copilot', () => {
		expect(pathsOf(pluginStorage('copilot-cli', { homedir: '/home/u', env: {} }))).toEqual([
			['installed-plugins', '/home/u/.copilot/installed-plugins'],
			['install-record', '/home/u/.copilot/config.json'],
			['enabled-record', '/home/u/.copilot/settings.json'],
		])
		expect(pluginStorage('copilot-cli', { homedir: '/home/u', env: { COPILOT_HOME: '/y' } }).configDir).toBe('/y')
	})

	it('places Cursor plugins under ~/.cursor/plugins and reports no enabled record', () => {
		const storage = pluginStorage('cursor', { homedir: '/home/u', env: {} })

		expect(pathsOf(storage)).toEqual([
			['local-plugins', '/home/u/.cursor/plugins/local'],
			['marketplaces', '/home/u/.cursor/plugins/marketplaces'],
		])
	})

	it('places OpenCode and Kilo Code plugins under their XDG config folders', () => {
		expect(pathsOf(pluginStorage('opencode', { homedir: '/home/u', env: {} }))).toEqual([
			['local-plugins', '/home/u/.config/opencode/plugins'],
		])
		expect(pathsOf(pluginStorage('kilo', { homedir: '/home/u', env: { XDG_CONFIG_HOME: '/xdg' } }))).toEqual([
			['local-plugins', '/xdg/kilo/plugin'],
		])
	})

	it('places Gemini CLI extensions under $GEMINI_CLI_HOME/.gemini, defaulting to ~/.gemini', () => {
		expect(pathsOf(pluginStorage('gemini-cli', { homedir: '/home/u', env: {} }))).toEqual([
			['installed-plugins', '/home/u/.gemini/extensions'],
			['enabled-record', '/home/u/.gemini/extensions/extension-enablement.json'],
		])
		expect(pluginStorage('gemini-cli', { homedir: '/home/u', env: { GEMINI_CLI_HOME: '/g' } }).configDir).toBe(
			'/g/.gemini',
		)
	})

	it('places Qwen Code extensions under $QWEN_HOME, defaulting to ~/.qwen', () => {
		expect(pathsOf(pluginStorage('qwen-code', { homedir: '/home/u', env: {} }))).toEqual([
			['installed-plugins', '/home/u/.qwen/extensions'],
			['enabled-record', '/home/u/.qwen/extensions/extension-enablement.json'],
		])
		expect(pluginStorage('qwen-code', { homedir: '/home/u', env: { QWEN_HOME: '/q' } }).configDir).toBe('/q')
	})

	it("places Copilot in VS Code agent plugins under VS Code's user data folder per OS", () => {
		const installed = (platform: NodeJS.Platform, env = {}) =>
			pathsOf(pluginStorage('vscode-copilot', { homedir: '/home/u', env, platform }))

		expect(installed('linux')).toEqual([['installed-plugins', '/home/u/.config/Code/agentPlugins']])
		expect(installed('darwin')).toEqual([
			['installed-plugins', '/home/u/Library/Application Support/Code/agentPlugins'],
		])
		expect(installed('win32', { APPDATA: 'C:\\Users\\u\\AppData\\Roaming' })).toEqual([
			['installed-plugins', 'C:\\Users\\u\\AppData\\Roaming\\Code\\agentPlugins'],
		])
	})

	it('places Cline plugins under ~/.cline/plugins/_installed', () => {
		expect(pathsOf(pluginStorage('cline', { homedir: '/home/u', env: {} }))).toEqual([
			['installed-plugins', '/home/u/.cline/plugins/_installed'],
		])
	})
})
