import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { bandRangeText, estimateWeight, findWeightBand, formulaText } from './estimate'

const bands = fixture.weightFromAge

describe('estimateWeight', () => {
  it.each([
    [11, null],
    [12, 10],
    [23, 10],
    [42, 16],
    [167, 46],
    [168, null],
  ])('%d months → %s kg', (months, expected) => {
    expect(estimateWeight(bands, months)).toBe(expected)
  })

  it('uses months when the band says so', () => {
    const monthBand = { ...bands[0], ageIn: 'months' as const, fromMonths: 0, toMonthsExclusive: 12, multiplyBy: 0.5, thenAddKg: 4 }
    expect(estimateWeight([monthBand], 6)).toBe(7)
  })
})

describe('band text', () => {
  it('describes the range and formula', () => {
    expect(bandRangeText(bands)).toBe('1–13 years')
    expect(formulaText(bands[0])).toBe('(3 × age in years) + 7')
    expect(findWeightBand(bands, 12)?.name).toBe('UK resuscitation formula')
  })

  it('names both units when they differ', () => {
    const mixed = { ...bands[0], fromAge: { value: 6, unit: 'month' as const } }
    expect(bandRangeText([mixed])).toBe('6 months–13 years')
  })
})
