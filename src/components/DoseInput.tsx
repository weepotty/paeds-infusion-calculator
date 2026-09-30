import { useState } from 'react'
import { parseDecimalInput } from '../calc/patient'
import { doseUnitLabel } from '../calc/units'
import type { Drug } from '../data/types'

type Props = { drug: Drug; dose: number; onDoseChange: (dose: number) => void }

export const doseStep = (min: number): number => (min / 10 >= 1 ? 1 : Number((min / 5).toPrecision(1)))

export const DoseInput = ({ drug, dose, onDoseChange }: Props) => {
  const [text, setText] = useState(String(dose))
  const step = doseStep(drug.dose.min)

  const change = (value: string) => {
    setText(value)
    const parsed = parseDecimalInput(value)
    if (parsed !== null) onDoseChange(parsed)
  }

  const nudge = (direction: 1 | -1) => {
    const next = Math.max(0, Number((dose + direction * step).toPrecision(6)))
    setText(String(next))
    onDoseChange(next)
  }

  return (
    <div className="dose-input">
      <button type="button" className="step-btn" aria-label="Decrease dose" onClick={() => nudge(-1)}>
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={`Dose for ${drug.name}`}
        value={text}
        onChange={event => change(event.target.value)}
      />
      <button type="button" className="step-btn" aria-label="Increase dose" onClick={() => nudge(1)}>
        +
      </button>
      <span>{doseUnitLabel(drug.dose.unit)}</span>
    </div>
  )
}
