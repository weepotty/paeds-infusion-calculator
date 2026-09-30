import type { Age, WeightBand } from '../data/types'

export const findWeightBand = (bands: WeightBand[], ageMonths: number): WeightBand | null =>
  bands.find(band => ageMonths >= band.fromMonths && ageMonths < band.toMonthsExclusive) ?? null

export const estimateWeight = (bands: WeightBand[], ageMonths: number): number | null => {
  const band = findWeightBand(bands, ageMonths)
  if (!band) return null
  const age = band.ageIn === 'years' ? Math.floor(ageMonths / 12) : ageMonths
  return Math.round((band.multiplyBy * age + band.thenAddKg) * 10) / 10
}

const unitWord = (age: Age) => `${age.unit}${age.value === 1 ? '' : 's'}`

const rangeText = (band: WeightBand) =>
  band.fromAge.unit === band.toAge.unit
    ? `${band.fromAge.value}–${band.toAge.value} ${unitWord(band.toAge)}`
    : `${band.fromAge.value} ${unitWord(band.fromAge)}–${band.toAge.value} ${unitWord(band.toAge)}`

export const bandRangeText = (bands: WeightBand[]): string => bands.map(rangeText).join(' or ')

export const formulaText = (band: WeightBand): string => `(${band.multiplyBy} × age in ${band.ageIn}) + ${band.thenAddKg}`
