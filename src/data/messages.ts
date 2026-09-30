import type { z } from 'zod'

const EXPECTED: Record<string, string> = {
  number: 'a number',
  string: 'text',
  array: 'a list',
  object: 'a section',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const childOf = (node: unknown, key: PropertyKey): unknown => {
  if (Array.isArray(node) && typeof key === 'number') return node[key]
  if (isRecord(node) && typeof key === 'string') return node[key]
  return undefined
}

const nameOf = (item: unknown, index: number): string =>
  isRecord(item) && typeof item.name === 'string' && item.name !== '' ? item.name : `entry ${index + 1}`

export const describePath = (path: readonly PropertyKey[], raw: unknown): string => {
  const parts: string[] = []
  let node = raw
  path.forEach((key, index) => {
    const child = childOf(node, key)
    if (typeof key === 'number') {
      parts.push(nameOf(child, key))
    } else if (!(key === 'drugs' && typeof path[index + 1] === 'number')) {
      parts.push(String(key))
    }
    node = child
  })
  return parts.length === 0 ? 'drugs.yaml' : parts.join(' → ')
}

const problem = (issue: z.core.$ZodIssue): string => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) return 'is missing'
      if (issue.input === null) return 'is empty'
      return `must be ${EXPECTED[issue.expected] ?? issue.expected}`
    case 'unrecognized_keys':
      return `unknown field ${issue.keys.map(key => `"${key}"`).join(', ')}. Check the spelling.`
    case 'too_small':
      if (issue.origin === 'string') return 'must not be empty'
      if (issue.origin === 'array') return `must have at least ${issue.minimum} entry`
      return `must be ${issue.inclusive ? 'at least' : 'more than'} ${issue.minimum}`
    case 'too_big':
      return `must be ${issue.inclusive ? 'at most' : 'less than'} ${issue.maximum}`
    case 'invalid_value':
      return `must be one of: ${issue.values.map(String).join(', ')}`
    default:
      return issue.message
  }
}

const foundText = (issue: z.core.$ZodIssue): string => {
  const input = issue.input
  const printable = typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean'
  if (!printable || input === '' || issue.code === 'unrecognized_keys') return ''
  return ` (found ${JSON.stringify(input)})`
}

export const describeIssue = (issue: z.core.$ZodIssue, raw: unknown): string =>
  `${describePath(issue.path, raw)}: ${problem(issue)}${foundText(issue)}`
