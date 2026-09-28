import { describe, expect, it } from 'vitest'

import { skillsDirectories } from './skills-directories.js'

describe('skillsDirectories', () => {
	it('reads only .claude/skills in Claude Code', () => {
		expect(skillsDirectories('claude-code')).toEqual({
			project: ['.claude/skills'],
			user: ['.claude/skills'],
			research: ['E-CC-L1'],
		})
	})

	it.each(['cursor', 'codex', 'copilot-cli', 'vscode-copilot', 'opencode', 'gemini-cli'] as const)(
		'includes .agents/skills at both scopes in %s',
		(harness) => {
			const directories = skillsDirectories(harness)
			expect(directories?.project).toContain('.agents/skills')
			expect(directories?.user).toContain('.agents/skills')
		},
	)

	it.each(['claude-code', 'cline', 'augment'] as const)('does not include .agents/skills in %s', (harness) => {
		const directories = skillsDirectories(harness)
		expect(directories?.project).not.toContain('.agents/skills')
		expect(directories?.user).not.toContain('.agents/skills')
	})

	it('lists the .agents/skills alias before .gemini/skills in Gemini CLI, which it takes precedence over', () => {
		expect(skillsDirectories('gemini-cli')?.project).toEqual(['.agents/skills', '.gemini/skills'])
	})

	it.each(['kilo', 'qwen-code', 'crush', 'openhands'] as const)(
		'returns undefined for %s, where the directories are not confirmed',
		(harness) => {
			expect(skillsDirectories(harness)).toBeUndefined()
		},
	)
})
