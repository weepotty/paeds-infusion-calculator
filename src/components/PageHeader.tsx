import type { ReactNode } from 'react'
import './PageHeader.css'

type Props = { children: ReactNode }

export const PageHeader = ({ children }: Props) => (
  <header className="page-header">
    <div className="page-header-inner page-column">
      <div className="brand">
        <img className="brand-icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} />
        <span>
          <strong>Paeds Infusion Calculator</strong> · PICU and transfer
        </span>
      </div>
      {children}
    </div>
  </header>
)
