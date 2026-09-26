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
})
