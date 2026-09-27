import { describe, expect, it } from 'vitest'

import { skillInvocation } from './skill-invocation.js'

describe('skillInvocation', () => {
	it('namespaces a Claude Code plugin skill by plugin', () => {
		expect(skillInvocation('claude-code', { plugin: 'my-plugin', skill: 'review' })).toEqual({
			text: '/my-plugin:review',
			namespaced: true,
			research: 'E-CC-S1',
		})
	})

	it('uses the bare skill name as a slash command in Cursor and Copilot CLI', () => {
		expect(skillInvocation('cursor', { plugin: 'p', skill: 'review' })?.text).toBe('/review')
		expect(skillInvocation('copilot-cli', { plugin: 'p', skill: 'review' })?.text).toBe('/review')
	})

	it('mentions a Codex skill with $', () => {
		expect(skillInvocation('codex', { plugin: 'p', skill: 'review' })).toMatchObject({
			text: '$review',
			namespaced: false,
		})
	})

	it('namespaces a plugin skill by plugin in Copilot in VS Code', () => {
		expect(skillInvocation('vscode-copilot', { plugin: 'my-plugin', skill: 'review' })).toEqual({
			text: '/my-plugin:review',
			namespaced: true,
			research: 'E-VSC-S1',
		})
	})

	it('uses the bare skill name as a slash command in Cline', () => {
		expect(skillInvocation('cline', { plugin: 'p', skill: 'review' })).toMatchObject({
			text: '/review',
			namespaced: false,
		})
	})

	it.each(['opencode', 'kilo', 'gemini-cli', 'qwen-code'] as const)(
		'returns undefined for %s, where the model loads skills through a tool and no invocation is typed',
		(harness) => {
			expect(skillInvocation(harness, { plugin: 'p', skill: 'review' })).toBeUndefined()
		},
	)
})
