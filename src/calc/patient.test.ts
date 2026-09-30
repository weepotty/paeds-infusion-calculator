import { describe, expect, it } from 'vitest'
import { parseAgeInput, parseDecimalInput } from './patient'

describe('parseAgeInput', () => {
  it('treats two empty boxes as no age', () => {
    expect(parseAgeInput('', ' ')).toEqual({ kind: 'none' })
  })

  it.each([
    ['3', '', 36],
    ['3', '6', 42],
    ['', '8', 8],
    ['', '30', 30],
    ['18', '0', 216],
  ])('%s years %s months → %d months', (years, months, expected) => {
    expect(parseAgeInput(years, months)).toEqual({ kind: 'age', months: expected })
  })

  it.each([
    ['2.5', '', 'Enter age as whole years and months.'],
    ['-1', '', 'Enter age as whole years and months.'],
    ['3', '12', 'Months should be 0–11 when years are entered.'],
    ['18', '1', 'Age is over 18 years. Check the age.'],
  ])('%s years %s months is an error', (years, months, message) => {
    expect(parseAgeInput(years, months)).toEqual({ kind: 'error', message })
  })
})

describe('parseDecimalInput', () => {
  it.each([
    ['14', 14],
    ['14.5', 14.5],
    ['14,5', 14.5],
    [' 0.8 ', 0.8],
    ['.5', 0.5],
    ['14.', 14],
  ])('%j → %d', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected)
  })

  it.each(['', 'abc', '1.2.3', '-3', '1e3'])('%j → null', text => {
    expect(parseDecimalInput(text)).toBeNull()
  })
})
