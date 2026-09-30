import { useEffect, useRef } from 'react'
import type { AppData } from '../data/types'

type Props = { disclaimer: AppData['disclaimer']; onAcknowledge: () => void }

export const Disclaimer = ({ disclaimer, onAcknowledge }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div className="disclaimer-backdrop">
      <div className="disclaimer" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <div className="disc-head">
          <h2 id="disclaimer-title">{disclaimer.title}</h2>
        </div>
        <div className="disc-body">
          <p className="disc-heading">{disclaimer.heading}</p>
          {disclaimer.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="disc-foot">
          <button type="button" ref={buttonRef} onClick={onAcknowledge}>
            {disclaimer.button}
          </button>
        </div>
      </div>
    </div>
  )
}
