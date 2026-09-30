import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SafeguardingFlag } from './SafeguardingFlag'
import { SafeguardingMask } from './SafeguardingMask'

const safeguarding = { weightKg: 17, expectedKg: 10, message: 'This weight is far above the expected weight for age.' }

it('mask shows the weights, the message and both actions', async () => {
  const onChangeWeight = vi.fn()
  const onProceed = vi.fn()
  render(<SafeguardingMask safeguarding={safeguarding} onChangeWeight={onChangeWeight} onProceed={onProceed} />)
  const card = screen.getByRole('alertdialog', { name: 'Safeguarding flag' })
  expect(card).toHaveFocus()
  expect(screen.getByText('17 kg entered. Expected for age: about 10 kg.')).toBeInTheDocument()
  expect(screen.getByText(safeguarding.message)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Change weight' }))
  expect(onChangeWeight).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Proceed with this weight' }))
  expect(onProceed).toHaveBeenCalledOnce()
})

it('flag reminds the user which weight they proceeded with', () => {
  render(<SafeguardingFlag safeguarding={safeguarding} />)
  expect(screen.getByText('Safeguarding flag')).toBeInTheDocument()
  expect(screen.getByText('17 kg entered. Expected for age: about 10 kg. Proceeding with 17 kg.')).toBeInTheDocument()
})
