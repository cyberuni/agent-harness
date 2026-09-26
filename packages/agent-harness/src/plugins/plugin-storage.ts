import { join } from 'node:path'

import { type HarnessEnvironment, resolveHarnessEnvironment } from '../harness/harness-environment.js'
import type { HarnessId } from '../harness/harness-id.js'

/**
 * - `plugin-cache`: installed plugin copies, one folder per marketplace, plugin, and version.
 * - `installed-plugins`: installed plugin folders not split by version.
 * - `local-plugins`: a folder the harness scans for plugins under development.
 * - `marketplaces`: marketplace checkouts.
 * - `install-record`: the file that records which plugins are installed.
 * - `enabled-record`: the user-level file that records which plugins are enabled.
 */
export type PluginStorageKind =
	| 'plugin-cache'
	| 'installed-plugins'
	| 'local-plugins'
	| 'marketplaces'
	| 'install-record'
	| 'enabled-record'

export interface PluginStorageLocation {
	readonly kind: PluginStorageKind
	readonly path: string
	readonly description: string
	/** The claim ID in `.research/harness-detection/evidence.md` that backs this location. */
	readonly research: string
}

export interface PluginStorage {
	readonly harness: HarnessId
	/** The harness's user-level config directory, after any override environment variable. */
	readonly configDir: string
	readonly locations: readonly PluginStorageLocation[]
}

/**
 * Where a harness keeps plugins at the user level. Paths are computed, not checked: a location may
 * not exist until the first plugin is installed.
 */
export function pluginStorage(harness: HarnessId, environment: HarnessEnvironment = {}): PluginStorage {
	const { env, homedir } = resolveHarnessEnvironment(environment)
	return storages[harness](env, homedir)
}

type Env = Readonly<Record<string, string | undefined>>

const storages: Record<HarnessId, (env: Env, homedir: string) => PluginStorage> = {
	'claude-code': (env, homedir) => {
		const configDir = env.CLAUDE_CONFIG_DIR || join(homedir, '.claude')
		const plugins = join(configDir, 'plugins')
		return {
			harness: 'claude-code',
			configDir,
			locations: [
				{
					kind: 'plugin-cache',
					path: join(plugins, 'cache'),
					description: 'Installed plugins as <marketplace>/<plugin>/<version>/',
					research: 'E-CC-P1',
				},
				{
					kind: 'marketplaces',
					path: join(plugins, 'marketplaces'),
					description: 'Marketplace checkouts',
					research: 'E-CC-P1',
				},
				{
					kind: 'install-record',
					path: join(plugins, 'installed_plugins.json'),
					description: 'Installs keyed by plugin@marketplace, each with scope, installPath, and version',
					research: 'E-CC-P2',
				},
				{
					kind: 'enabled-record',
					path: join(configDir, 'settings.json'),
					description: 'User settings; enabledPlugins maps plugin@marketplace to a boolean',
					research: 'E-CC-P3',
				},
			],
		}
	},
	cursor: (_env, homedir) => {
		// The shipped CLI builds these from the home directory, not from a config-dir override.
		const configDir = join(homedir, '.cursor')
		return {
			harness: 'cursor',
			configDir,
			locations: [
				{
					kind: 'local-plugins',
					path: join(configDir, 'plugins', 'local'),
					description: 'Plugins under development, one folder each',
					research: 'E-CUR-P2',
				},
				{
					kind: 'marketplaces',
					path: join(configDir, 'plugins', 'marketplaces'),
					description: 'Marketplace checkouts',
					research: 'E-CUR-P3',
				},
			],
		}
	},
	codex: (env, homedir) => {
		const configDir = env.CODEX_HOME || join(homedir, '.codex')
		return {
			harness: 'codex',
			configDir,
			locations: [
				{
					kind: 'plugin-cache',
					path: join(configDir, 'plugins', 'cache'),
					description: 'Installed plugins as <marketplace>/<plugin>/<version>/',
					research: 'E-CODEX-P3',
				},
				{
					kind: 'enabled-record',
					path: join(configDir, 'config.toml'),
					description: 'User config; [plugins."<plugin>@<marketplace>"] tables carry enabled = <bool>',
					research: 'E-CODEX-P2',
				},
			],
		}
	},
	'copilot-cli': (env, homedir) => {
		const configDir = env.COPILOT_HOME || join(homedir, '.copilot')
		return {
			harness: 'copilot-cli',
			configDir,
			locations: [
				{
					kind: 'installed-plugins',
					path: join(configDir, 'installed-plugins'),
					description: 'Installed plugins as <marketplace>/<plugin>/, or _direct/<source-id>/ for direct installs',
					research: 'E-COPILOT-P9',
				},
				{
					kind: 'install-record',
					path: join(configDir, 'config.json'),
					description: 'Application state, including installedPlugins',
					research: 'E-COPILOT-P9',
				},
				{
					kind: 'enabled-record',
					path: join(configDir, 'settings.json'),
					description: 'User settings (JSON with comments); enabledPlugins maps plugin specs to a boolean',
					research: 'E-COPILOT-P4',
				},
			],
		}
	},
}
