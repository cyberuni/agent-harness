import { randomUUID } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { type Exec, nodeExec } from './exec.js'
import { LEASE_LIBRARY, type LeaseReason, parseLeaseReason } from './owner.js'

/** A held worktree: what `acquire` hands out and `release` takes back. */
export interface Lease {
	/** The worktree root, as `WorktreeEntry.root` gives it. */
	worktree: string
	leaseId: string
	holder: string
}

/**
 * The file operations the lease store performs on git's `locked` file, injected so a caller can
 * sandbox them or a test can stage the race with `git worktree lock` (E-GIT-L5). Paths are absolute.
 */
export interface LeaseFs {
	/** Create the file only if nothing is there; `false` when something already is. */
	createExclusive(path: string, text: string): Promise<boolean>
	/** The file's text, or `undefined` when it does not exist. */
	readText(path: string): Promise<string | undefined>
	/** Delete the file; a no-op when it is already gone. */
	remove(path: string): Promise<void>
}

/** The default `LeaseFs`, on `node:fs/promises`. */
export const nodeLeaseFs: LeaseFs = {
	async createExclusive(path, text) {
		try {
			await writeFile(path, text, { flag: 'wx' })
			return true
		} catch (error) {
			if ((error as { code?: string }).code === 'EEXIST') return false
			throw error
		}
	},
	async readText(path) {
		try {
			return await readFile(path, 'utf8')
		} catch (error) {
			if ((error as { code?: string }).code === 'ENOENT') return undefined
			throw error
		}
	},
	async remove(path) {
		try {
			await unlink(path)
		} catch (error) {
			if ((error as { code?: string }).code !== 'ENOENT') throw error
		}
	},
}

export interface LeaseStoreOptions {
	exec?: Exec | undefined
	/** Defaults to `nodeLeaseFs`. */
	fs?: LeaseFs | undefined
}

/**
 * `$GIT_COMMON_DIR/worktrees/<id>/locked` for a linked worktree, or `undefined` when git cannot say
 * (the checkout is gone). The `<id>` is git's admin folder name, which need not match the basename,
 * so it is read from `--git-dir` rather than built.
 */
export async function leaseFile(worktreeRoot: string, exec: Exec = nodeExec): Promise<string | undefined> {
	const gitDir = await exec('git', ['-C', worktreeRoot, 'rev-parse', '--path-format=absolute', '--git-dir'])
	return gitDir ? join(gitDir, 'locked') : undefined
}

/**
 * Claim a worktree: exclusive-create its `locked` file with the lease as a one-line JSON reason, which
 * git then honours as a lock (E-GIT-L1, E-GIT-L2, E-GIT-L3), and read it back. `git worktree lock`
 * checks then truncates, so it can overwrite a lease created inside its window (E-GIT-L5); the read
 * back catches that. `undefined` when the worktree is already locked or the claim was lost.
 */
export async function claimLease(
	worktreeRoot: string,
	holder: string,
	options: LeaseStoreOptions & { leaseId?: string | undefined } = {},
): Promise<Lease | undefined> {
	const exec = options.exec ?? nodeExec
	const fs = options.fs ?? nodeLeaseFs
	const path = await leaseFile(worktreeRoot, exec)
	if (!path) return undefined
	const lease: Lease = { worktree: worktreeRoot, leaseId: options.leaseId ?? randomUUID(), holder }
	const reason: LeaseReason = { library: LEASE_LIBRARY, leaseId: lease.leaseId, holder }
	if (!(await fs.createExclusive(path, JSON.stringify(reason)))) return undefined
	return (await holdsLease(lease, { exec, fs })) ? lease : undefined
}

/** Whether the worktree's `locked` file still records this lease. Checked again before a destructive
 * step, since a manual `git worktree unlock` or a racing `lock` can take it away (E-GIT-L4, E-GIT-L5). */
export async function holdsLease(lease: Lease, options: LeaseStoreOptions = {}): Promise<boolean> {
	const path = await leaseFile(lease.worktree, options.exec ?? nodeExec)
	if (!path) return false
	const text = await (options.fs ?? nodeLeaseFs).readText(path)
	return parseLeaseReason(text)?.leaseId === lease.leaseId
}

export type ReleaseResult =
	| { released: true }
	/** The `locked` file no longer records this lease: someone unlocked it, broke it with
	 * `remove -f -f` (E-GIT-L4), or locked over it. Reported, not thrown: that is the user's override. */
	| { released: false; reason: 'lost' }

/**
 * Give a lease back by deleting the `locked` file, only when it still records this `leaseId`. It does
 * not recycle: an occupant such as a judge may still be working there, so the next `acquire` recycles
 * after probing.
 */
export async function release(lease: Lease, options: LeaseStoreOptions = {}): Promise<ReleaseResult> {
	const exec = options.exec ?? nodeExec
	const fs = options.fs ?? nodeLeaseFs
	const path = await leaseFile(lease.worktree, exec)
	if (!path || parseLeaseReason(await fs.readText(path))?.leaseId !== lease.leaseId)
		return { released: false, reason: 'lost' }
	await fs.remove(path)
	return { released: true }
}
