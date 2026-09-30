import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fixture } from './test/fixture'
import { App } from './App'

const renderApp = async () => {
  render(<App data={fixture} />)
  await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
}

const submit = async (years: string, weight: string) => {
  if (years !== '') await userEvent.type(screen.getByLabelText('Age, years'), years)
  if (weight !== '') await userEvent.type(screen.getByLabelText('Weight'), weight)
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
}

const adrenalineRow = () => screen.getByRole('button', { name: /^Adrenaline/ })

describe('disclaimer', () => {
  it('blocks the page until acknowledged', async () => {
    render(<App data={fixture} />)
    expect(screen.getByTestId('page')).toHaveAttribute('inert')
    await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('page')).not.toHaveAttribute('inert')
  })
})

it('shows the banner and data version', async () => {
  await renderApp()
  expect(screen.getByText('Prototype only. Not for clinical use.')).toBeInTheDocument()
  expect(screen.getByText(`Data version ${fixture.version} · Updated ${fixture.updated}`)).toBeInTheDocument()
})

it('shows rates after Submit', async () => {
  await renderApp()
  expect(within(adrenalineRow()).getByText('–')).toBeInTheDocument()
  await submit('3', '14')
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 14 kg · 3 years')
  expect(within(adrenalineRow()).getByText('1.0')).toBeInTheDocument()
})

it('goes stale after an edit and refreshes on Submit', async () => {
  await renderApp()
  await submit('', '14')
  await userEvent.type(screen.getByLabelText('Weight'), '0')
  expect(screen.getByText('Age or weight changed. Press Submit to update the rates.')).toBeInTheDocument()
  expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 140 kg')
  expect(screen.getByTestId('drug-list')).not.toHaveAttribute('inert')
})

it('blocks an impossible weight', async () => {
  await renderApp()
  await submit('', '200')
  expect(screen.getByText('200 kg is not a possible weight. Enter a weight between 0.3 and 150 kg.')).toBeInTheDocument()
  expect(within(adrenalineRow()).getByText('–')).toBeInTheDocument()
})

it('does not run age checks on an estimated weight', async () => {
  await renderApp()
  await userEvent.type(screen.getByLabelText('Age, years'), '1')
  await userEvent.click(screen.getByLabelText('estimate weight'))
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 10 kg Estimated · 1 year')
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})

describe('safeguarding', () => {
  it('masks results until the user proceeds, and again on every Submit', async () => {
    await renderApp()
    await submit('1', '17')
    expect(screen.getByRole('alertdialog', { name: 'Safeguarding flag' })).toBeInTheDocument()
    expect(screen.getByText(fixture.weightForAgeChecks.messageAbove)).toBeInTheDocument()
    expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Proceed with this weight' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('17 kg entered. Expected for age: about 10 kg. Proceeding with 17 kg.')).toBeInTheDocument()
    expect(screen.getByTestId('drug-list')).not.toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByRole('alertdialog', { name: 'Safeguarding flag' })).toBeInTheDocument()
  })

  it('Change weight focuses the weight box', async () => {
    await renderApp()
    await submit('1', '5')
    expect(screen.getByText(fixture.weightForAgeChecks.messageBelow)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change weight' }))
    expect(screen.getByLabelText('Weight')).toHaveFocus()
  })
})

it('resets adjusted doses to the start dose on every Submit', async () => {
  await renderApp()
  await submit('', '10')
  await userEvent.click(adrenalineRow())
  const dose = screen.getByLabelText('Dose for Adrenaline')
  await userEvent.clear(dose)
  await userEvent.type(dose, '0.2')
  expect(within(adrenalineRow()).getByText('2.0')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(within(adrenalineRow()).getByText('1.0')).toBeInTheDocument()
  await userEvent.click(adrenalineRow())
  expect(screen.getByLabelText('Dose for Adrenaline')).toHaveValue('0.1')
})

it('shows the update banner above the disclaimer so it can always be used', () => {
  const registerUpdates = (onUpdateReady: (reload: () => void) => void) => onUpdateReady(() => {})
  render(<App data={fixture} registerUpdates={registerUpdates} />)
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reload' }).closest('[inert]')).toBeNull()
})
