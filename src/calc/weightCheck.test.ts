import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { checkWeight, safeguardingDetail } from './weightCheck'

const measured = (weightKg: number | null, ageMonths: number | null = null) =>
  checkWeight({ weightKg, ageMonths, estimated: false }, fixture)

describe('checkWeight limits', () => {
  it('asks for a weight when there is none', () => {
    expect(measured(null)).toEqual({ ok: false, message: "Enter the child's weight in kg." })
  })

  it.each([0.2, 151])('blocks %d kg', weightKg => {
    expect(measured(weightKg)).toEqual({
      ok: false,
      message: `${weightKg} kg is not a possible weight. Enter a weight between 0.3 and 150 kg.`,
    })
  })

  it.each([0.4, 85])('warns about %d kg but allows it', weightKg => {
    expect(measured(weightKg)).toEqual({
      ok: true,
      notes: [`${weightKg} kg is outside the usual 0.5–80 kg range. Check the weight.`],
      safeguarding: null,
    })
  })
})

describe('checkWeight against age (1 year, expected 10 kg)', () => {
  it('says nothing within 25%', () => {
    expect(measured(12.5, 12)).toEqual({ ok: true, notes: [], safeguarding: null })
  })

  it('adds a check note beyond 25%', () => {
    expect(measured(13, 12)).toEqual({
      ok: true,
      notes: ['13 kg is higher than expected for this age (about 10 kg). Check the weight and age.'],
      safeguarding: null,
    })
    expect(measured(6, 12)).toMatchObject({ notes: ['6 kg is lower than expected for this age (about 10 kg). Check the weight and age.'] })
    expect(measured(16, 12)).toMatchObject({ safeguarding: null })
  })

  it('raises safeguarding beyond 60% above or 40% below', () => {
    expect(measured(16.1, 12)).toEqual({
      ok: true,
      notes: [],
      safeguarding: { weightKg: 16.1, expectedKg: 10, message: fixture.weightForAgeChecks.messageAbove },
    })
    expect(measured(5.9, 12)).toMatchObject({ safeguarding: { message: fixture.weightForAgeChecks.messageBelow } })
  })

  it('skips age checks for an estimated weight', () => {
    expect(checkWeight({ weightKg: 5.9, ageMonths: 12, estimated: true }, fixture)).toEqual({
      ok: true,
      notes: [],
      safeguarding: null,
    })
  })

  it('skips age checks outside every band', () => {
    expect(measured(5.9, 200)).toEqual({ ok: true, notes: [], safeguarding: null })
  })

  it('describes the safeguarding flag', () => {
    expect(safeguardingDetail({ weightKg: 17, expectedKg: 10, message: '' })).toBe(
      '17 kg entered. Expected for age: about 10 kg.',
    )
  })
})

describe('checkWeight float precision (age 24 months, expected 13 kg)', () => {
  it('handles exactly 60% above without safeguarding', () => {
    expect(measured(20.8, 24)).toEqual({
      ok: true,
      notes: ['20.8 kg is higher than expected for this age (about 13 kg). Check the weight and age.'],
      safeguarding: null,
    })
  })

  it('raises safeguarding above 60%', () => {
    expect(measured(20.9, 24)).toMatchObject({
      safeguarding: { weightKg: 20.9, expectedKg: 13, message: fixture.weightForAgeChecks.messageAbove },
    })
  })

  it('handles exactly 40% below without safeguarding', () => {
    expect(measured(7.8, 24)).toEqual({
      ok: true,
      notes: ['7.8 kg is lower than expected for this age (about 13 kg). Check the weight and age.'],
      safeguarding: null,
    })
  })

  it('raises safeguarding below 40%', () => {
    expect(measured(7.7, 24)).toMatchObject({
      safeguarding: { weightKg: 7.7, expectedKg: 13, message: fixture.weightForAgeChecks.messageBelow },
    })
  })

  it('handles exactly 25% within tolerance', () => {
    expect(measured(16.25, 24)).toEqual({
      ok: true,
      notes: [],
      safeguarding: null,
    })
  })
})
