import { describe, expect, it } from 'vitest'
import { fixtureYaml } from '../test/fixture'
import { loadData } from './load'

const errorsFor = (yamlText: string): string[] => {
  const result = loadData(yamlText)
  if (result.ok) throw new Error('Expected the data to be rejected')
  return result.errors
}

const broken = (find: string, replace: string) => {
  expect(fixtureYaml).toContain(find)
  return errorsFor(fixtureYaml.replace(find, replace))
}

describe('loadData', () => {
  it('reads the fixture into typed data', () => {
    const result = loadData(fixtureYaml)
    if (!result.ok) throw new Error(result.errors.join('\n'))
    const adrenaline = result.data.drugs[0]
    expect(adrenaline).toMatchObject({
      name: 'Adrenaline',
      group: 'vasopressor',
      stock: { value: 1, unit: 'mg' },
      syringe: { amount: { value: 0.3, unit: 'mg', perKg: true }, volumeMl: 50, diluent: null },
      dose: { unit: { unit: 'micrograms', per: 'min' }, min: 0.05, start: 0.1, max: 1 },
      notes: '',
    })
    expect(result.data.disclaimer.paragraphs).toHaveLength(2)
    expect(result.data.prototypeBanner).toBe('Prototype only. Not for clinical use.')
    expect(result.data.reportEmail).toBe('placeholder@gmail.com')
    expect(result.data.weightFromAge[0]).toMatchObject({ fromMonths: 12, toMonthsExclusive: 168, ageIn: 'years' })
    expect(new Set(result.data.drugs.map(drug => drug.id)).size).toBe(result.data.drugs.length)
  })

  it('accepts spacing and case variants', () => {
    const result = loadData(fixtureYaml.replace('amount: 0.3 mg/kg', 'amount: 0.3MG / kg').replace('make_up_to: 50 mL', 'make_up_to: 50 ML'))
    expect(result.ok).toBe(true)
  })

  it('rejects a report email that is not an email address', () => {
    expect(broken('report_email: placeholder@gmail.com', 'report_email: placeholder')).toContain(
      'report_email: must be an email address, or "" to hide the link (found "placeholder")',
    )
  })

  it('allows an empty report email', () => {
    const result = loadData(fixtureYaml.replace('report_email: placeholder@gmail.com', 'report_email: ""'))
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(result.data.reportEmail).toBe('')
  })

  it('rejects a decimal comma', () => {
    expect(broken('max: 1\n', 'max: 1,5\n')).toContain('Adrenaline → dose → max: must be a number (found "1,5")')
  })

  it('rejects a misspelt field', () => {
    const errors = broken('    reviewed_by: PLACEHOLDER', '    reviewd_by: PLACEHOLDER')
    expect(errors).toContain('Adrenaline: unknown field "reviewd_by". Check the spelling.')
    expect(errors).toContain('Adrenaline → reviewed_by: is missing')
  })

  it('rejects an empty reviewed_by', () => {
    expect(broken('reviewed_by: PLACEHOLDER', 'reviewed_by:')).toContain('Adrenaline → reviewed_by: is empty')
  })

  it('rejects an unknown unit, with an example', () => {
    expect(broken('amount: 0.3 mg/kg', 'amount: 0.3 mcg/kg')).toContainEqual(
      expect.stringContaining('Adrenaline → syringe → amount: should look like "0.3 mg/kg"'),
    )
  })

  it('rejects an unknown group', () => {
    expect(broken('group: vasopressor', 'group: vasopresor')).toContain(
      'Adrenaline → group: must be one of: vasopressor, opioid, benzodiazepine, induction, neuromuscular_blocker, other (found "vasopresor")',
    )
  })

  it('rejects a zero strength', () => {
    expect(broken('stock: 1 mg/mL', 'stock: 0 mg/mL')).toContain('Adrenaline → stock: must be more than 0')
  })

  it('rejects doses out of order', () => {
    expect(broken('start: 0.1', 'start: 5')).toContain('Adrenaline → dose: must be in order min ≤ start ≤ max (found 0.05, 5, 1)')
  })

  it('rejects a dose unit that cannot be converted to the syringe unit', () => {
    expect(broken('unit: units/kg/hour', 'unit: mg/kg/hour')).toContain(
      'Insulin (soluble) → dose → unit: is in mg but the syringe amount is in units',
    )
  })

  it('rejects two drugs with the same name', () => {
    expect(broken('name: Noradrenaline', 'name: Adrenaline')).toContain('Adrenaline → name: another drug is also called "Adrenaline"')
  })

  it('rejects weight limits out of order', () => {
    expect(broken('warn_above_kg: 80', 'warn_above_kg: 200')).toContain(
      'weight_limits: must be in order: block_below_kg < warn_below_kg < warn_above_kg < block_above_kg',
    )
  })

  it('reports broken YAML', () => {
    expect(errorsFor('drugs:\n  - name: A\n   group: other')[0]).toMatch(/^drugs\.yaml could not be read/)
  })

  it('reports an empty file', () => {
    expect(errorsFor('')).toEqual(['drugs.yaml: is empty'])
  })
})
