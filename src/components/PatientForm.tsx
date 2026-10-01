import { type FormEvent, type RefObject, useState } from 'react'
import { bandRangeText, estimateWeight, findWeightBand, formulaText } from '../calc/estimate'
import { type PatientInput, parseAgeInput, parseDecimalInput } from '../calc/patient'
import type { WeightCheck } from '../calc/weightCheck'
import type { WeightBand } from '../data/types'
import { PrimaryButton } from './PrimaryButton'
import { UnitField } from './UnitField'
import './PatientForm.css'

type Props = {
  bands: WeightBand[]
  check: WeightCheck | null
  weightInputRef: RefObject<HTMLInputElement | null>
  onSubmit: (patient: PatientInput) => void
  onEdit: () => void
}

const estimateFor = (bands: WeightBand[], years: string, months: string): number | null => {
  const age = parseAgeInput(years, months)
  return age.kind === 'age' ? estimateWeight(bands, age.months) : null
}

const hintText = (bands: WeightBand[], band: WeightBand | null, estimate: boolean): string => {
  if (bands.length === 0) return ''
  if (band === null) return `Enter an age of ${bandRangeText(bands)} to estimate weight.`
  if (estimate) return `${band.name}: ${formulaText(band)}.`
  return ''
}

const messageText = (ageError: string | null, check: WeightCheck | null): string => {
  if (ageError !== null) return ageError
  if (check === null) return ''
  if (!check.ok) return check.message
  return check.notes.join(' ')
}

export const PatientForm = ({ bands, check, weightInputRef, onSubmit, onEdit }: Props) => {
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [weight, setWeight] = useState('')
  const [estimate, setEstimate] = useState(false)
  const [ageError, setAgeError] = useState<string | null>(null)

  const age = parseAgeInput(years, months)
  const ageMonths = age.kind === 'age' ? age.months : null
  const band = ageMonths === null ? null : findWeightBand(bands, ageMonths)
  const estimateKg = estimateFor(bands, years, months)
  const shownWeight = estimate && estimateKg !== null ? String(estimateKg) : weight
  const weightInvalid = check !== null && !check.ok

  const changeAge = (nextYears: string, nextMonths: string) => {
    setYears(nextYears)
    setMonths(nextMonths)
    if (estimate && estimateFor(bands, nextYears, nextMonths) === null) {
      setEstimate(false)
      setWeight('')
    }
    onEdit()
  }

  const toggleEstimate = (checked: boolean) => {
    setEstimate(checked)
    setWeight('')
    onEdit()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (age.kind === 'error') {
      setAgeError(age.message)
      return
    }
    setAgeError(null)
    onSubmit({ ageMonths, weightKg: parseDecimalInput(shownWeight), estimated: estimate })
  }

  return (
    <form className="patient" noValidate onSubmit={submit}>
      <div className="prow">
        <label className="plabel" htmlFor="age-years">
          Age
        </label>
        <div className="pfields">
          <UnitField
            id="age-years"
            unit="years"
            inputMode="numeric"
            aria-label="Age, years"
            invalid={ageError !== null}
            value={years}
            onChange={event => changeAge(event.target.value, months)}
          />
          <UnitField
            id="age-months"
            unit="months"
            inputMode="numeric"
            aria-label="Age, months"
            invalid={ageError !== null}
            value={months}
            onChange={event => changeAge(years, event.target.value)}
          />
        </div>
      </div>
      <div className="prow">
        <label className="plabel" htmlFor="weight">
          Weight
        </label>
        <div className="pfields">
          <UnitField
            id="weight"
            unit="kg"
            ref={weightInputRef}
            inputMode="decimal"
            invalid={weightInvalid}
            readOnly={estimate}
            value={shownWeight}
            onChange={event => {
              setWeight(event.target.value)
              onEdit()
            }}
          />
          {band === null ? null : (
            <label className="est">
              estimate weight
              <input
                type="checkbox"
                checked={estimate}
                aria-describedby="est-hint"
                onChange={event => toggleEstimate(event.target.checked)}
              />
            </label>
          )}
        </div>
        <p className="est-hint" id="est-hint">
          {hintText(bands, band, estimate)}
        </p>
      </div>
      <div className="weight-msg" aria-live="polite">
        {messageText(ageError, check)}
      </div>
      <PrimaryButton type="submit" className="psubmit">
        Submit
      </PrimaryButton>
    </form>
  )
}
