import { formatNumber, formatRate } from '../calc/format'
import { calculateInfusion, type Infusion } from '../calc/infusion'
import { doseUnitLabel } from '../calc/units'
import type { Drug } from '../data/types'
import { DoseInput } from './DoseInput'

type Props = {
  drug: Drug
  weightKg: number | null
  dose: number
  standardDiluent: string
  expanded: boolean
  onToggle: () => void
  onDoseChange: (dose: number) => void
}

const contentsText = (drug: Drug, infusion: Infusion | null) =>
  infusion === null
    ? 'Needs a valid weight'
    : `${formatNumber(infusion.totalAmount)} ${drug.syringe.amount.unit} in ${formatNumber(drug.syringe.volumeMl)} mL`

const rateText = (infusion: Infusion | null) => {
  if (infusion === null) return '–'
  return infusion.fits ? formatRate(infusion.rateMlPerHour) : 'does not fit'
}

const outOfRange = (drug: Drug, dose: number) => dose < drug.dose.min || dose > drug.dose.max

const RangeWarning = ({ drug, dose }: { drug: Drug; dose: number }) => {
  if (!outOfRange(drug, dose)) return null
  const above = dose > drug.dose.max
  return (
    <div className={above ? 'alert danger' : 'alert warn'}>
      {above ? 'Above' : 'Below'} the usual range of {formatNumber(drug.dose.min)}–{formatNumber(drug.dose.max)}{' '}
      {doseUnitLabel(drug.dose.unit)}.
    </div>
  )
}

type DetailsProps = Omit<Props, 'expanded' | 'onToggle'> & { infusion: Infusion | null }

const DrugDetails = ({ drug, weightKg, dose, standardDiluent, infusion, onDoseChange }: DetailsProps) => {
  if (infusion === null || weightKg === null) {
    return (
      <div className="row-body">
        <div className="alert danger">Enter a valid weight to see the preparation and rate.</div>
      </div>
    )
  }
  const volume = formatNumber(drug.syringe.volumeMl)
  return (
    <div className="row-body">
      {infusion.fits ? (
        <div className="instr">
          Draw up <b>{formatNumber(infusion.drawUpMl)} mL</b> of {formatNumber(drug.stock.value)} {drug.stock.unit}/mL.
          Make up to <b>{volume} mL</b> with {drug.syringe.diluent ?? standardDiluent}.
        </div>
      ) : (
        <div className="alert danger">
          Needs {formatNumber(infusion.drawUpMl)} mL of stock, which does not fit a {volume} mL syringe at{' '}
          {formatNumber(weightKg)} kg. Check the guideline.
        </div>
      )}
      <div className="rule">
        1 mL/hr = <b>{formatNumber(infusion.oneMlPerHour)} {doseUnitLabel(drug.dose.unit)}</b>
      </div>
      <DoseInput drug={drug} dose={dose} onDoseChange={onDoseChange} />
      <RangeWarning drug={drug} dose={dose} />
      {drug.notes === '' ? null : <div className="notes">{drug.notes}</div>}
    </div>
  )
}

export const DrugRow = (props: Props) => {
  const { drug, weightKg, dose, expanded, onToggle } = props
  const infusion = weightKg === null ? null : calculateInfusion(drug, weightKg, dose)
  const fits = infusion !== null && infusion.fits
  return (
    <div className="row">
      <button type="button" className="row-head" aria-expanded={expanded} onClick={onToggle}>
        <span className="rname">
          {drug.name}
          <small>{contentsText(drug, infusion)}</small>
        </span>
        <span className={dose === drug.dose.start ? 'rrate' : 'rrate adjusted'}>
          <b className={infusion !== null && !fits ? 'no-fit' : undefined}>{rateText(infusion)}</b>
          {infusion !== null && !fits ? null : <span className="u"> mL/hr</span>}
          <small className={outOfRange(drug, dose) ? 'flag' : undefined}>
            {formatNumber(dose)} {doseUnitLabel(drug.dose.unit)}
          </small>
        </span>
        <span className="chev" aria-hidden="true" />
      </button>
      {expanded ? <DrugDetails {...props} infusion={infusion} /> : null}
    </div>
  )
}
