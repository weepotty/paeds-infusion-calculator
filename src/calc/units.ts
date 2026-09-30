import type { AmountUnit, DoseUnit } from '../data/types'

const IN_SMALLEST_UNIT: Record<AmountUnit, number> = { nanograms: 1, micrograms: 1e3, mg: 1e6, units: 1 }

export const unitFamily = (unit: AmountUnit): 'mass' | 'units' => (unit === 'units' ? 'units' : 'mass')

export const convertAmount = (value: number, from: AmountUnit, to: AmountUnit): number =>
  (value * IN_SMALLEST_UNIT[from]) / IN_SMALLEST_UNIT[to]

export const doseUnitLabel = (unit: DoseUnit): string => `${unit.unit}/kg/${unit.per}`
