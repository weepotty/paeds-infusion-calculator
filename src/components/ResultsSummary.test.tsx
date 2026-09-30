import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Submission } from '../calc/weightCheck'
import { ResultsSummary } from './ResultsSummary'

const ok: Submission['check'] = { ok: true, notes: [], safeguarding: null }

it('prompts before the first submit', () => {
  render(<ResultsSummary submission={null} stale={false} />)
  expect(screen.getByText("Enter the child's weight, then press Submit.")).toBeInTheDocument()
})

it('shows weight and age', () => {
  render(<ResultsSummary submission={{ weightKg: 14, ageMonths: 42, estimated: false, check: ok }} stale={false} />)
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 14 kg · 3 years 6 months')
})

it('tags an estimated weight and omits a missing age', () => {
  render(<ResultsSummary submission={{ weightKg: 10, ageMonths: null, estimated: true, check: ok }} stale={false} />)
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 10 kg Estimated')
})

it('says when the form has changed', () => {
  render(<ResultsSummary submission={{ weightKg: 14, ageMonths: null, estimated: false, check: ok }} stale />)
  expect(screen.getByText('Age or weight changed. Press Submit to update the rates.')).toBeInTheDocument()
})

it('asks for a valid weight after a blocked weight', () => {
  render(<ResultsSummary submission={{ weightKg: 200, ageMonths: null, estimated: false, check: { ok: false, message: 'x' } }} stale={false} />)
  expect(screen.getByText('Enter a valid weight to see rates.')).toBeInTheDocument()
})
