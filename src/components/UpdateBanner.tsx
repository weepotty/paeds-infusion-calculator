import { useEffect, useRef, useState } from 'react'

export type RegisterUpdates = (onUpdateReady: (reload: () => void) => void) => void

type Props = { registerUpdates: RegisterUpdates }

export const UpdateBanner = ({ registerUpdates }: Props) => {
  const [reload, setReload] = useState<(() => void) | null>(null)
  const registered = useRef(false)

  useEffect(() => {
    if (registered.current) return
    registered.current = true
    registerUpdates(next => setReload(() => next))
  }, [registerUpdates])

  return reload === null ? null : (
    <div className="update-banner" role="alert">
      <span>A newer version of this calculator is available. Reload to use the new version.</span>
      <button type="button" onClick={reload}>
        Reload
      </button>
    </div>
  )
}
