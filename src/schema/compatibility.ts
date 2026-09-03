export type CompatibilityStatus = 'compatible' | 'breaking' | 'unknown'

export interface CompatibilityResult {
  status: CompatibilityStatus
  direction: 'backward'
  reasons: string[]
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function strings(value: unknown): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
}

/** Conservative backward-compatibility analysis: unknown means human review, never an optimistic pass. */
export function analyzeBackwardCompatibility(before: unknown, after: unknown): CompatibilityResult {
  const left = record(before)
  const right = record(after)
  if (!left || !right) return { status: 'unknown', direction: 'backward', reasons: ['schemas are not JSON objects'] }
  if (JSON.stringify(left) === JSON.stringify(right)) return { status: 'compatible', direction: 'backward', reasons: ['schemas are identical'] }
  const reasons: string[] = []
  if (left.type !== undefined && right.type !== undefined && JSON.stringify(left.type) !== JSON.stringify(right.type)) reasons.push('accepted root type changed')
  const oldRequired = strings(left.required)
  for (const field of strings(right.required)) if (!oldRequired.has(field)) reasons.push(`required property added: ${field}`)
  const oldProperties = record(left.properties) ?? {}
  const newProperties = record(right.properties) ?? {}
  for (const field of Object.keys(oldProperties)) if (!(field in newProperties)) reasons.push(`property removed: ${field}`)
  if (left.additionalProperties !== false && right.additionalProperties === false) reasons.push('additional properties changed from allowed to forbidden')
  const oldEnum = strings(left.enum)
  const newEnum = strings(right.enum)
  if (oldEnum.size && newEnum.size) for (const member of oldEnum) if (!newEnum.has(member)) reasons.push(`enum member removed: ${member}`)
  return reasons.length
    ? { status: 'breaking', direction: 'backward', reasons }
    : { status: 'unknown', direction: 'backward', reasons: ['no conservative breaking rule matched; review is required'] }
}

export function analyzeCompatibilityChain(schemas: readonly unknown[]): CompatibilityResult[] {
  return schemas.slice(1).map((schema, index) => analyzeBackwardCompatibility(schemas[index], schema))
}
