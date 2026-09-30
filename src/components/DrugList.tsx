import { useState } from 'react'
import { DRUG_GROUPS } from '../data/groups'
import type { Drug } from '../data/types'
import { DrugRow } from './DrugRow'

type Props = {
  drugs: Drug[]
  weightKg: number | null
  doses: Record<string, number>
  standardDiluent: string
  stale: boolean
  masked: boolean
  onDoseChange: (drugId: string, dose: number) => void
}

const listClass = (stale: boolean, masked: boolean) =>
  ['list', stale ? 'stale' : '', masked ? 'masked' : ''].filter(name => name !== '').join(' ')

export const DrugList = ({ drugs, weightKg, doses, standardDiluent, stale, masked, onDoseChange }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className={listClass(stale, masked)} data-testid="drug-list" inert={stale || masked}>
      {DRUG_GROUPS.map(group => {
        const items = drugs.filter(drug => drug.group === group.key)
        if (items.length === 0) return null
        return (
          <section key={group.key}>
            <h3 className="grp-title">
              <span className="swatch" style={{ background: group.colour }} />
              {group.label}
            </h3>
            <div className="grp">
              {items.map(drug => (
                <DrugRow
                  key={drug.id}
                  drug={drug}
                  weightKg={weightKg}
                  dose={doses[drug.id] ?? drug.dose.start}
                  standardDiluent={standardDiluent}
                  expanded={expandedId === drug.id}
                  onToggle={() => setExpandedId(current => (current === drug.id ? null : drug.id))}
                  onDoseChange={dose => onDoseChange(drug.id, dose)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
