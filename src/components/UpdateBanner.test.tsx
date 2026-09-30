import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { type RegisterUpdates, UpdateBanner } from './UpdateBanner'

const fakeRegister = () => {
  let announce: ((reload: () => void) => void) | null = null
  const registerUpdates: RegisterUpdates = onUpdateReady => {
    announce = onUpdateReady
  }
  const updateArrives = (reload: () => void) => act(() => announce?.(reload))
  return { registerUpdates, updateArrives }
}

it('shows nothing until an update is ready', () => {
  const { registerUpdates } = fakeRegister()
  const { container } = render(<UpdateBanner registerUpdates={registerUpdates} />)
  expect(container).toBeEmptyDOMElement()
})

it('asks the user to reload when new drug data arrives', async () => {
  const { registerUpdates, updateArrives } = fakeRegister()
  const reload = vi.fn()
  render(<UpdateBanner registerUpdates={registerUpdates} />)
  updateArrives(reload)
  expect(screen.getByRole('alert')).toHaveTextContent('Drug formulas have been updated by the administrator. Reload to use the new version.')
  await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
  expect(reload).toHaveBeenCalledOnce()
})

it('registers only once', () => {
  const registerUpdates = vi.fn()
  const { rerender } = render(<UpdateBanner registerUpdates={registerUpdates} />)
  rerender(<UpdateBanner registerUpdates={registerUpdates} />)
  expect(registerUpdates).toHaveBeenCalledOnce()
})
