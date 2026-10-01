import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<'input'>, 'className' | 'aria-invalid'> & { unit: string; invalid: boolean }

export const UnitField = ({ unit, invalid, ...props }: Props) => (
  <span className="pf">
    <input {...props} aria-invalid={invalid} className={invalid ? 'invalid' : undefined} />
    <span>{unit}</span>
  </span>
)
