import type { ComponentProps } from 'react'
import './PrimaryButton.css'

type Props = ComponentProps<'button'>

export const PrimaryButton = ({ className, children, type = 'button', ...props }: Props) => (
  <button {...props} type={type} className={className === undefined ? 'btn-primary' : `btn-primary ${className}`}>
    <span className="btn-top">{children}</span>
  </button>
)
