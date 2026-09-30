import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { fixture } from '../test/fixture'
import { Disclaimer } from './Disclaimer'

it('shows the wording from the data and focuses the button', () => {
  render(<Disclaimer disclaimer={fixture.disclaimer} onAcknowledge={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'Please read' })).toBeInTheDocument()
  expect(screen.getByText('Disclaimer:')).toBeInTheDocument()
  expect(screen.getByText('A second paragraph can go here if needed.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'I understand' })).toHaveFocus()
})

it('calls onAcknowledge from the button only', async () => {
  const onAcknowledge = vi.fn()
  render(<Disclaimer disclaimer={fixture.disclaimer} onAcknowledge={onAcknowledge} />)
  await userEvent.keyboard('{Escape}')
  expect(onAcknowledge).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
  expect(onAcknowledge).toHaveBeenCalledOnce()
})
