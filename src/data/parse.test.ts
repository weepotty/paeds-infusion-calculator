import { describe, expect, it } from 'vitest'
import { ageEndMonths, ageInMonths, parseAge, parseAmount, parseDoseUnit, parseStock, parseVolume } from './parse'

describe('parseAmount', () => {
  it.each([
    ['0.3 mg/kg', { value: 0.3, unit: 'mg', perKg: true }],
    ['50 units', { value: 50, unit: 'units', perKg: false }],
    ['200 micrograms', { value: 200, unit: 'micrograms', perKg: false }],
    ['0.3mg/kg', { value: 0.3, unit: 'mg', perKg: true }],
    ['0.3 mg / kg', { value: 0.3, unit: 'mg', perKg: true }],
    [' 15 MG/KG ', { value: 15, unit: 'mg', perKg: true }],
  ])('reads %j', (text, expected) => {
    expect(parseAmount(text)).toEqual(expected)
  })

  it.each(['0,3 mg/kg', '.3 mg/kg', '0.3 mcg/kg', 'mg/kg', '0.3', '0.3 mg/kg/min'])('rejects %j', text => {
    expect(parseAmount(text)).toBeNull()
  })
})

describe('parseStock', () => {
  it('reads a strength per mL', () => {
    expect(parseStock('1 mg/mL')).toEqual({ value: 1, unit: 'mg' })
    expect(parseStock('100 units/ml')).toEqual({ value: 100, unit: 'units' })
    expect(parseStock('50 micrograms / mL')).toEqual({ value: 50, unit: 'micrograms' })
  })

  it('rejects anything not per mL', () => {
    expect(parseStock('1 mg')).toBeNull()
    expect(parseStock('1 mg/L')).toBeNull()
  })
})

describe('parseVolume', () => {
  it('reads mL', () => {
    expect(parseVolume('50 mL')).toBe(50)
    expect(parseVolume('50ML')).toBe(50)
  })

  it('rejects other units', () => {
    expect(parseVolume('50')).toBeNull()
    expect(parseVolume('0.05 L')).toBeNull()
  })
})

describe('parseDoseUnit', () => {
  it.each([
    ['micrograms/kg/min', { unit: 'micrograms', per: 'min' }],
    ['mg/kg/hour', { unit: 'mg', per: 'hour' }],
    ['units / kg / hour', { unit: 'units', per: 'hour' }],
    ['nanograms/kg/min', { unit: 'nanograms', per: 'min' }],
  ])('reads %j', (text, expected) => {
    expect(parseDoseUnit(text)).toEqual(expected)
  })

  it.each(['micrograms/min', 'mcg/kg/min', 'mg/kg/hr', 'mg/kg'])('rejects %j', text => {
    expect(parseDoseUnit(text)).toBeNull()
  })
})

describe('parseAge', () => {
  it('reads years and months', () => {
    expect(parseAge('1 year')).toEqual({ value: 1, unit: 'year' })
    expect(parseAge('13 years')).toEqual({ value: 13, unit: 'year' })
    expect(parseAge('0 months')).toEqual({ value: 0, unit: 'month' })
  })

  it('rejects fractions and other words', () => {
    expect(parseAge('1.5 years')).toBeNull()
    expect(parseAge('13 yrs')).toBeNull()
  })

  it('converts to months, including the whole of the last year or month', () => {
    expect(ageInMonths({ value: 1, unit: 'year' })).toBe(12)
    expect(ageEndMonths({ value: 13, unit: 'year' })).toBe(168)
    expect(ageEndMonths({ value: 6, unit: 'month' })).toBe(7)
  })
})
