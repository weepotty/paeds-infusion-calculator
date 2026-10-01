import { useEffect, useState } from 'react'
import { PrimaryButton } from './PrimaryButton'
import './BackToTop.css'

const SHOW_AFTER_PX = 400

const useScrolledPast = (px: number) => {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const update = () => setPast(window.scrollY > px)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [px])

  return past
}

export const BackToTop = () => {
  const visible = useScrolledPast(SHOW_AFTER_PX)
  if (!visible) return null

  return (
    <PrimaryButton
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </PrimaryButton>
  )
}
