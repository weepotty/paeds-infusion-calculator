import { useEffect, useRef } from 'react'
import type { AppData } from '../data/types'

type Props = { disclaimer: AppData['disclaimer']; onAcknowledge: () => void }

export const Disclaimer = ({ disclaimer, onAcknowledge }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
    document.documentElement.classList.add('locked')
    return () => document.documentElement.classList.remove('locked')
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
          <button type="button" className="btn-primary" ref={buttonRef} onClick={onAcknowledge}>
            <span className="btn-top">{disclaimer.button}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
