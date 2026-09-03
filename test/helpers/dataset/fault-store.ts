export type CommitFault = 'none' | 'before-commit' | 'after-commit'

export class DeterministicCommitFault extends Error {
  constructor(readonly boundary: Exclude<CommitFault, 'none'>) { super(`CONFORMANCE_CRASH_${boundary === 'before-commit' ? 'BEFORE' : 'AFTER'}_COMMIT`) }
}

export async function withCommitFault<T>(fault: CommitFault, commit: () => Promise<T>): Promise<T> {
  if (fault === 'before-commit') throw new DeterministicCommitFault(fault)
  const result = await commit()
  if (fault === 'after-commit') throw new DeterministicCommitFault(fault)
  return result
}
