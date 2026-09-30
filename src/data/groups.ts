import type { DrugGroup } from './types'

export const DRUG_GROUPS: { key: DrugGroup; label: string; colour: string }[] = [
  { key: 'vasopressor', label: 'Vasopressors and inotropes', colour: 'var(--iso-vaso)' },
  { key: 'opioid', label: 'Opioids', colour: 'var(--iso-opioid)' },
  { key: 'benzodiazepine', label: 'Benzodiazepines', colour: 'var(--iso-benzo)' },
  { key: 'induction', label: 'Induction agents', colour: 'var(--iso-induction)' },
  { key: 'neuromuscular_blocker', label: 'Neuromuscular blockers', colour: 'var(--iso-nmb)' },
  { key: 'other', label: 'Other', colour: 'var(--iso-other)' },
]
