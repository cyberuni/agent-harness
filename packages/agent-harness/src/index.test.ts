import { describe, expect, it } from 'vitest'

import { detectHarness } from './index.js'

describe('detectHarness', () => {
	it('reports unknown with no evidence, since detection is not yet implemented', () => {
		expect(detectHarness()).toEqual({ harness: 'unknown', evidence: [] })
	})
})
