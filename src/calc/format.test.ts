import { describe, expect, it } from 'vitest'
import { formatAge, formatNumber, formatRate, formatWeight } from './format'

describe('formatNumber', () => {
  it.each([
    [0.9, '0.9'],
    [0.8999999999999999, '0.9'],
    [3.75, '3.75'],
    [1.33333, '1.33'],
    [11.25, '11.3'],
    [0.0333333, '0.0333'],
    [50, '50'],
    [1500, '1500'],
    [Number.NaN, '–'],
  ])('%d → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('formatRate', () => {
  it.each([
    [1, '1.0'],
    [12.34, '12.3'],
    [0.5, '0.50'],
    [0.375, '0.38'],
    [0.004, '< 0.01'],
    [0, '0.00'],
    [Number.POSITIVE_INFINITY, '–'],
  ])('%d → %s', (value, expected) => {
    expect(formatRate(value)).toBe(expected)
  })
})

describe('formatAge', () => {
  it.each([
    [0, '0 months'],
    [1, '1 month'],
    [12, '1 year'],
    [13, '1 year 1 month'],
    [42, '3 years 6 months'],
  ])('%d months → %s', (months, expected) => {
    expect(formatAge(months)).toBe(expected)
  })
})

describe('formatWeight', () => {
  it.each([
    [12.25, '12.25'],
    [150.4, '150.4'],
    [100.5, '100.5'],
    [14, '14'],
    [0.3, '0.3'],
    [3.456, '3.46'],
    [Number.NaN, '–'],
  ])('%d → %s', (value, expected) => {
    expect(formatWeight(value)).toBe(expected)
  })
})
