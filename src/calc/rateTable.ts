import type { Drug } from '../data/types'
import { formatNumber, formatRate } from './format'
import { calculateInfusion } from './infusion'
import { doseUnitLabel } from './units'

const WEIGHTS_KG = [3, 10, 30]

type Column = { title: string; value: (drug: Drug) => string }

const rateAt = (weightKg: number) => (drug: Drug) => {
  const infusion = calculateInfusion(drug, weightKg, drug.dose.start)
  return infusion.fits ? formatRate(infusion.rateMlPerHour) : 'does not fit'
}

const COLUMNS: Column[] = [
  { title: 'Start dose', value: drug => `${formatNumber(drug.dose.start)} ${doseUnitLabel(drug.dose.unit)}` },
  { title: 'Range', value: drug => `${formatNumber(drug.dose.min)}–${formatNumber(drug.dose.max)}` },
  ...WEIGHTS_KG.map(weightKg => ({ title: `${weightKg} kg`, value: rateAt(weightKg) })),
]

const cell = (column: Column, before: Drug | undefined, after: Drug | undefined, compare: boolean) => {
  const now = after === undefined ? '—' : column.value(after)
  if (!compare) return now
  const was = before === undefined ? '—' : column.value(before)
  return was === now ? now : `${was} → **${now}**`
}

export const rateTable = (before: Drug[] | null, after: Drug[]): string => {
  const compare = before !== null
  const names = [...new Set([...(before ?? []).map(drug => drug.name), ...after.map(drug => drug.name)])]
  const rows = names.map(name => {
    const was = before?.find(drug => drug.name === name)
    const now = after.find(drug => drug.name === name)
    return `| ${name} | ${COLUMNS.map(column => cell(column, was, now, compare)).join(' | ')} |`
  })
  return [
    '### Rates at the start dose (mL/hr)',
    '',
    compare ? 'Changed values show before → **after**.' : 'No earlier version to compare with.',
    '',
    `| Drug | ${COLUMNS.map(column => column.title).join(' | ')} |`,
    `| --- |${COLUMNS.map(() => ' --- |').join('')}`,
    ...rows,
    '',
  ].join('\n')
}
