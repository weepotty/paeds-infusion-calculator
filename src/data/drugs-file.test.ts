import { expect, it } from 'vitest'
import raw from '../../drugs.yaml?raw'
import { calculateInfusion } from '../calc/infusion'
import { loadData } from './load'

it('drugs.yaml is valid', () => {
  const result = loadData(raw)
  expect(result.ok ? [] : result.errors).toEqual([])
})

it('every drug in drugs.yaml gives a finite rate at 3, 10 and 30 kg', () => {
  const result = loadData(raw)
  if (!result.ok) throw new Error(result.errors.join('\n'))
  for (const drug of result.data.drugs) {
    for (const weightKg of [3, 10, 30]) {
      const rate = calculateInfusion(drug, weightKg, drug.dose.start).rateMlPerHour
      expect(Number.isFinite(rate) && rate > 0, `${drug.name} at ${weightKg} kg`).toBe(true)
    }
  }
})
