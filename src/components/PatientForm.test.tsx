import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fixture } from '../test/fixture'
import { PatientForm } from './PatientForm'

const setup = (check: Parameters<typeof PatientForm>[0]['check'] = null) => {
  const onSubmit = vi.fn()
  const onEdit = vi.fn()
  render(
    <PatientForm
      bands={fixture.weightFromAge}
      check={check}
      weightInputRef={createRef<HTMLInputElement>()}
      onSubmit={onSubmit}
      onEdit={onEdit}
    />,
  )
  return {
    onSubmit,
    onEdit,
    years: screen.getByLabelText('Age, years'),
    months: screen.getByLabelText('Age, months'),
    weight: screen.getByLabelText('Weight'),
  }
}

describe('estimate weight', () => {
  it('is hidden without a covered age, with a hint', async () => {
    const { months } = setup()
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
    expect(screen.getByText('Enter an age of 1–13 years to estimate weight.')).toBeInTheDocument()
    await userEvent.type(months, '11')
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
  })

  it('fills and locks the weight when ticked', async () => {
    const { years, weight } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    expect(weight).toHaveValue('10')
    expect(weight).toHaveAttribute('readonly')
    expect(screen.getByText('UK resuscitation formula: (3 × age in years) + 7.')).toBeInTheDocument()
  })

  it('unticks and clears the weight when the age leaves the range', async () => {
    const { years, weight } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    await userEvent.type(years, '4')
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
    expect(weight).toHaveValue('')
    expect(weight).not.toHaveAttribute('readonly')
  })
})

describe('submit', () => {
  it('sends the age in months and a comma-decimal weight', async () => {
    const { years, months, weight, onSubmit } = setup()
    await userEvent.type(years, '3')
    await userEvent.type(months, '6')
    await userEvent.type(weight, '14,5')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: 42, weightKg: 14.5, estimated: false })
  })

  it('submits on Enter', async () => {
    const { weight, onSubmit } = setup()
    await userEvent.type(weight, '14{Enter}')
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: null, weightKg: 14, estimated: false })
  })

  it('sends an estimated weight', async () => {
    const { years, onSubmit } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: 12, weightKg: 10, estimated: true })
  })

  it('shows an age error and does not submit', async () => {
    const { years, months, weight, onSubmit } = setup()
    await userEvent.type(years, '3')
    await userEvent.type(months, '12')
    await userEvent.type(weight, '14')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Months should be 0–11 when years are entered.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reports every edit', async () => {
    const { weight, onEdit } = setup()
    await userEvent.type(weight, '1')
    expect(onEdit).toHaveBeenCalled()
  })
})

it('shows the weight check message and marks the box invalid', () => {
  const { weight } = setup({ ok: false, message: '200 kg is not a possible weight.' })
  expect(screen.getByText('200 kg is not a possible weight.')).toBeInTheDocument()
  expect(weight).toHaveAttribute('aria-invalid', 'true')
})
