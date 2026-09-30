import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { startDoses } from '../calc/infusion'
import { fixture } from '../test/fixture'
import { DrugList } from './DrugList'

type HarnessProps = { weightKg: number | null; stale?: boolean }

const Harness = ({ weightKg, stale = false }: HarnessProps) => {
  const [doses, setDoses] = useState(() => startDoses(fixture.drugs))
  return (
    <DrugList
      drugs={fixture.drugs}
      weightKg={weightKg}
      doses={doses}
      standardDiluent={fixture.standardDiluent}
      stale={stale}
      masked={false}
      onDoseChange={(drugId, dose) => setDoses(previous => ({ ...previous, [drugId]: dose }))}
    />
  )
}

const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`) })

describe('rows', () => {
  it('shows the syringe and rate for each drug, grouped', () => {
    render(<Harness weightKg={10} />)
    expect(screen.getByText('Vasopressors and inotropes')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('3 mg in 50 mL')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('1.0')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('0.1 micrograms/kg/min')).toBeInTheDocument()
    expect(within(row('Insulin (soluble)')).getByText('0.50')).toBeInTheDocument()
  })

  it('shows dashes without a valid weight', () => {
    render(<Harness weightKg={null} />)
    expect(within(row('Adrenaline')).getByText('Needs a valid weight')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('–')).toBeInTheDocument()
  })

  it('says when the syringe does not fit', async () => {
    render(<Harness weightKg={30} />)
    expect(within(row('Thiopental')).getByText('does not fit')).toBeInTheDocument()
    await userEvent.click(row('Thiopental'))
    expect(
      screen.getByText('Needs 60 mL of stock, which does not fit a 50 mL syringe at 30 kg. Check the guideline.'),
    ).toBeInTheDocument()
  })

  it('is inert when stale', () => {
    render(<Harness weightKg={10} stale />)
    expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')
  })
})

describe('an open row', () => {
  it('shows how to make up the syringe, one row at a time', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    expect(row('Adrenaline')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Draw up/)).toHaveTextContent(
      'Draw up 3 mL of 1 mg/mL. Make up to 50 mL with glucose 5% or sodium chloride 0.9%.',
    )
    expect(screen.getByText(/1 mL\/hr =/)).toHaveTextContent('1 mL/hr = 0.1 micrograms/kg/min')
    await userEvent.click(row('Noradrenaline'))
    expect(row('Adrenaline')).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses the drug diluent when set', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Thiopental'))
    expect(screen.getByText(/Draw up/)).toHaveTextContent('with sodium chloride 0.9%.')
  })

  it('recalculates when the dose changes and warns outside the range', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    const dose = screen.getByLabelText('Dose for Adrenaline')
    await userEvent.clear(dose)
    await userEvent.type(dose, '0,2')
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    await userEvent.clear(dose)
    await userEvent.type(dose, '2')
    expect(screen.getByText('Above the usual range of 0.05–1 micrograms/kg/min.')).toBeInTheDocument()
    await userEvent.clear(dose)
    await userEvent.type(dose, '0.01')
    expect(screen.getByText('Below the usual range of 0.05–1 micrograms/kg/min.')).toBeInTheDocument()
  })

  it('keeps the last valid rate while the box is empty or part-typed', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    const dose = screen.getByLabelText('Dose for Adrenaline')
    await userEvent.clear(dose)
    await userEvent.type(dose, '0.2')
    await userEvent.clear(dose)
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    await userEvent.type(dose, 'abc')
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('steps the dose with the + and − buttons', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    await userEvent.click(screen.getByRole('button', { name: 'Increase dose' }))
    expect(screen.getByLabelText('Dose for Adrenaline')).toHaveValue('0.11')
    expect(within(row('Adrenaline')).getByText('1.1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Decrease dose' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease dose' }))
    expect(screen.getByLabelText('Dose for Adrenaline')).toHaveValue('0.09')
  })
})
