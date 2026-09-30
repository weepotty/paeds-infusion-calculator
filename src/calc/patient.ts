export type AgeInput = { kind: 'none' } | { kind: 'age'; months: number } | { kind: 'error'; message: string }

export type PatientInput = { ageMonths: number | null; weightKg: number | null; estimated: boolean }

const WHOLE = /^\d+$/
const DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/
const MAX_AGE_MONTHS = 216

export const parseAgeInput = (years: string, months: string): AgeInput => {
  const yearText = years.trim()
  const monthText = months.trim()
  if (yearText === '' && monthText === '') return { kind: 'none' }
  const badYears = yearText !== '' && !WHOLE.test(yearText)
  const badMonths = monthText !== '' && !WHOLE.test(monthText)
  if (badYears || badMonths) return { kind: 'error', message: 'Enter age as whole years and months.' }
  const yearCount = yearText === '' ? 0 : Number(yearText)
  const monthCount = monthText === '' ? 0 : Number(monthText)
  if (yearText !== '' && monthCount > 11) {
    return { kind: 'error', message: 'Months should be 0–11 when years are entered.' }
  }
  const total = yearCount * 12 + monthCount
  if (total > MAX_AGE_MONTHS) return { kind: 'error', message: 'Age is over 18 years. Check the age.' }
  return { kind: 'age', months: total }
}

export const parseDecimalInput = (text: string): number | null => {
  const normalised = text.trim().replace(',', '.')
  return DECIMAL.test(normalised) ? Number(normalised) : null
}
