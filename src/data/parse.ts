import type { Age, Amount, AmountUnit, DoseUnit, Stock } from './types'

export const AMOUNT_UNITS: AmountUnit[] = ['mg', 'micrograms', 'nanograms', 'units']

const NUMBER = String.raw`(\d+(?:\.\d+)?)`
const UNIT = `(${AMOUNT_UNITS.join('|')})`

const match = (pattern: string, text: string) => new RegExp(String.raw`^\s*${pattern}\s*$`, 'i').exec(text)

const toAmountUnit = (text: string): AmountUnit | null =>
  AMOUNT_UNITS.find(unit => unit === text.toLowerCase()) ?? null

export const parseAmount = (text: string): Amount | null => {
  const found = match(String.raw`${NUMBER}\s*${UNIT}(\s*/\s*kg)?`, text)
  const unit = found ? toAmountUnit(found[2]) : null
  if (!found || !unit) return null
  return { value: Number(found[1]), unit, perKg: found[3] !== undefined }
}

export const parseStock = (text: string): Stock | null => {
  const found = match(String.raw`${NUMBER}\s*${UNIT}\s*/\s*ml`, text)
  const unit = found ? toAmountUnit(found[2]) : null
  if (!found || !unit) return null
  return { value: Number(found[1]), unit }
}

export const parseVolume = (text: string): number | null => {
  const found = match(String.raw`${NUMBER}\s*ml`, text)
  return found ? Number(found[1]) : null
}

export const parseDoseUnit = (text: string): DoseUnit | null => {
  const found = match(String.raw`${UNIT}\s*/\s*kg\s*/\s*(min|hour)`, text)
  const unit = found ? toAmountUnit(found[1]) : null
  if (!found || !unit) return null
  return { unit, per: found[2].toLowerCase() === 'min' ? 'min' : 'hour' }
}

export const parseAge = (text: string): Age | null => {
  const found = match(String.raw`(\d+)\s*(years?|months?)`, text)
  if (!found) return null
  return { value: Number(found[1]), unit: found[2].toLowerCase().startsWith('y') ? 'year' : 'month' }
}

const monthsPer = (age: Age) => (age.unit === 'year' ? 12 : 1)

export const ageInMonths = (age: Age): number => age.value * monthsPer(age)

export const ageEndMonths = (age: Age): number => (age.value + 1) * monthsPer(age)
