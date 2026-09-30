import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Banner } from './Banner'

it('shows the banner text', () => {
  render(<Banner text="Prototype only. Not for clinical use." />)
  expect(screen.getByText('Prototype only. Not for clinical use.')).toBeInTheDocument()
})

it('renders nothing for empty text', () => {
  const { container } = render(<Banner text="" />)
  expect(container).toBeEmptyDOMElement()
})
