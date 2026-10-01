import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { BackToTop } from './BackToTop'

const scrollPageTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  fireEvent.scroll(window)
}

afterEach(() => scrollPageTo(0))

it('is hidden at the top of the page', () => {
  render(<BackToTop />)
  expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()
})

it('appears after scrolling down and scrolls back to the top', async () => {
  render(<BackToTop />)
  scrollPageTo(800)
  vi.mocked(window.scrollTo).mockClear()
  await userEvent.click(screen.getByRole('button', { name: 'Back to top' }))
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
})
