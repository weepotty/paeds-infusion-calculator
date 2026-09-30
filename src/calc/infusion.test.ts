import { describe, expect, it } from 'vitest'
import { fixture, fixtureDrug } from '../test/fixture'
import { calculateInfusion, startDoses } from './infusion'
import { convertAmount } from './units'

describe('convertAmount', () => {
  it('converts between mass units', () => {
    expect(convertAmount(1, 'mg', 'micrograms')).toBe(1000)
    expect(convertAmount(50, 'micrograms', 'mg')).toBe(0.05)
    expect(convertAmount(1, 'micrograms', 'nanograms')).toBe(1000)
    expect(convertAmount(5, 'units', 'units')).toBe(5)
  })
})

describe('calculateInfusion at 10 kg and the start dose', () => {
  it.each([
    ['Adrenaline', 3, 1, 0.1, 3],
    ['Noradrenaline', 3, 1, 0.1, 3],
    ['Dopamine', 150, 1, 5, 3.75],
    ['Dobutamine', 150, 1, 5, 12],
    ['Milrinone', 15, 1, 0.5, 15],
    ['Morphine', 10, 1, 20, 1],
    ['Fentanyl', 500, 2, 1, 10],
    ['Midazolam', 30, 1, 60, 6],
    ['Ketamine', 500, 1, 1, 10],
    ['Thiopental', 500, 2, 1, 20],
    ['Rocuronium', 100, 1.5, 0.2, 10],
    ['Salbutamol', 30, 1, 1, 30],
    ['Insulin (soluble)', 50, 0.5, 0.1, 0.5],
    ['Dexmedetomidine', 200, 1.25, 0.4, 2],
  ])('%s: total %d, rate %d mL/hr, 1 mL/hr = %d, draw up %d mL', (name, total, rate, oneMl, drawUp) => {
    const drug = fixtureDrug(name)
    const result = calculateInfusion(drug, 10, drug.dose.start)
    expect(result.totalAmount).toBeCloseTo(total, 6)
    expect(result.rateMlPerHour).toBeCloseTo(rate, 6)
    expect(result.oneMlPerHour).toBeCloseTo(oneMl, 6)
    expect(result.drawUpMl).toBeCloseTo(drawUp, 6)
    expect(result.fits).toBe(true)
  })
})

describe('calculateInfusion at other weights', () => {
  it('scales a per-kg syringe with weight', () => {
    const result = calculateInfusion(fixtureDrug('Adrenaline'), 3, 0.1)
    expect(result.totalAmount).toBeCloseTo(0.9, 6)
    expect(result.drawUpMl).toBeCloseTo(0.9, 6)
    expect(result.rateMlPerHour).toBeCloseTo(1, 6)
  })

  it('keeps a fixed syringe the same and scales the rate', () => {
    const at3 = calculateInfusion(fixtureDrug('Dexmedetomidine'), 3, 0.5)
    expect(at3.totalAmount).toBe(200)
    expect(at3.rateMlPerHour).toBeCloseTo(0.375, 6)
    expect(at3.oneMlPerHour).toBeCloseTo(1.33333, 4)
    expect(calculateInfusion(fixtureDrug('Insulin (soluble)'), 30, 0.05).rateMlPerHour).toBeCloseTo(1.5, 6)
  })

  it('doubles the rate when the dose doubles', () => {
    expect(calculateInfusion(fixtureDrug('Adrenaline'), 10, 0.2).rateMlPerHour).toBeCloseTo(2, 6)
  })

  it('flags a syringe that needs more stock than it holds', () => {
    const thiopental = calculateInfusion(fixtureDrug('Thiopental'), 30, 2)
    expect(thiopental.drawUpMl).toBeCloseTo(60, 6)
    expect(thiopental.fits).toBe(false)
    expect(calculateInfusion(fixtureDrug('Salbutamol'), 30, 1).fits).toBe(false)
  })
})

it('startDoses maps each drug id to its start dose', () => {
  const doses = startDoses(fixture.drugs)
  expect(doses[fixtureDrug('Adrenaline').id]).toBe(0.1)
  expect(Object.keys(doses)).toHaveLength(fixture.drugs.length)
})
