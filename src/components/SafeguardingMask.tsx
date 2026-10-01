import { useEffect, useRef } from 'react'
import { type Safeguarding, safeguardingDetail } from '../calc/weightCheck'
import { FlagIcon } from './FlagIcon'
import './Safeguarding.css'

type Props = { safeguarding: Safeguarding; onChangeWeight: () => void; onProceed: () => void }

export const SafeguardingMask = ({ safeguarding, onChangeWeight, onProceed }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="mask">
      <div
        className="mask-card"
        ref={cardRef}
        tabIndex={-1}
        role="alertdialog"
        aria-labelledby="mask-title"
        aria-describedby="mask-body"
      >
        <div className="mask-head">
          <FlagIcon />
          <strong id="mask-title">Safeguarding flag</strong>
        </div>
        <div className="mask-body" id="mask-body">
          <p className="kg">{safeguardingDetail(safeguarding)}</p>
          <p>{safeguarding.message}</p>
        </div>
        <div className="mask-actions">
          <button type="button" className="btn-secondary" onClick={onChangeWeight}>
            Change weight
          </button>
          <button type="button" className="btn-flag" onClick={onProceed}>
            Proceed with this weight
          </button>
        </div>
      </div>
    </div>
  )
}
