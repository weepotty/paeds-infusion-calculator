import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { rateTable } from './rateTable'

const adrenalineLine = (table: string) => table.split('\n').find(line => line.startsWith('| Adrenaline |'))

describe('rateTable', () => {
  it('lists every drug at 3, 10 and 30 kg', () => {
    const table = rateTable(null, fixture.drugs)
    expect(table).toContain('| Drug | Start dose | Range | 3 kg | 10 kg | 30 kg |')
    expect(adrenalineLine(table)).toBe('| Adrenaline | 0.1 micrograms/kg/min | 0.05–1 | 1.0 | 1.0 | 1.0 |')
    expect(table).toContain('| Thiopental | 2 mg/kg/hour | 1–5 | 2.0 | 2.0 | does not fit |')
    expect(table).toContain('No earlier version to compare with.')
  })

  it('shows changes as before → after', () => {
    const changed = fixture.drugs.map(drug =>
      drug.name === 'Adrenaline' ? { ...drug, dose: { ...drug.dose, start: 0.2 } } : drug,
    )
    expect(adrenalineLine(rateTable(fixture.drugs, changed))).toBe(
      '| Adrenaline | 0.1 micrograms/kg/min → **0.2 micrograms/kg/min** | 0.05–1 | 1.0 → **2.0** | 1.0 → **2.0** | 1.0 → **2.0** |',
    )
  })

  it('shows added and removed drugs', () => {
    const table = rateTable(fixture.drugs, fixture.drugs.filter(drug => drug.name !== 'Adrenaline'))
    expect(adrenalineLine(table)).toBe(
      '| Adrenaline | 0.1 micrograms/kg/min → **—** | 0.05–1 → **—** | 1.0 → **—** | 1.0 → **—** | 1.0 → **—** |',
    )
  })
})
