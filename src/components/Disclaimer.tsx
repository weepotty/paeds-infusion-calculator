import { useEffect, useRef } from 'react'
import type { AppData } from '../data/types'
import { PrimaryButton } from './PrimaryButton'
import './Disclaimer.css'

type Props = { disclaimer: AppData['disclaimer']; onAcknowledge: () => void }

const useScrollLock = () => {
  useEffect(() => {
    document.documentElement.classList.add('locked')
    return () => document.documentElement.classList.remove('locked')
  }, [])
}

export const Disclaimer = ({ disclaimer, onAcknowledge }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  useScrollLock()

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div className="disclaimer-backdrop">
      <div className="disclaimer" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <h2 className="disclaimer-title" id="disclaimer-title">
          {disclaimer.title}
        </h2>
        <div className="disclaimer-body">
          <p className="disclaimer-heading">{disclaimer.heading}</p>
          {disclaimer.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="disclaimer-actions">
          <PrimaryButton ref={buttonRef} onClick={onAcknowledge}>
            {disclaimer.button}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
