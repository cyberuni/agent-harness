import type { HarnessId } from '../harness/harness-id.js'

export interface PluginSkill {
	/** The plugin's `name`. */
	readonly plugin: string
	/** The skill's frontmatter `name`, which every harness uses as the skill segment. */
	readonly skill: string
}

export interface SkillInvocation {
	/** What a user types to invoke the skill: a slash command, or for Codex a `$` mention. */
	readonly text: string
	/** Whether the text names the plugin, so same-named skills from two plugins stay distinct. */
	readonly namespaced: boolean
	/** The claim ID in `.research/harness-detection/evidence.md` that backs this form. */
	readonly research: string
}

/**
 * How a user invokes a plugin's skill in a harness.
 *
 * Only Claude Code namespaces by plugin; elsewhere two plugins' skills with the same name collide
 * (Copilot CLI keeps the first one it finds).
 */
export function skillInvocation(harness: HarnessId, { plugin, skill }: PluginSkill): SkillInvocation {
	switch (harness) {
		case 'claude-code':
			return { text: `/${plugin}:${skill}`, namespaced: true, research: 'E-CC-S1' }
		case 'cursor':
			return { text: `/${skill}`, namespaced: false, research: 'E-CUR-S1' }
		case 'codex':
			return { text: `$${skill}`, namespaced: false, research: 'E-CODEX-S1' }
		case 'copilot-cli':
			return { text: `/${skill}`, namespaced: false, research: 'E-COPILOT-S6' }
	}
}
