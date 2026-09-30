import { registerSW } from 'virtual:pwa-register'
import type { RegisterUpdates } from './components/UpdateBanner'

const CHECK_EVERY_MS = 15 * 60 * 1000

const activateAndReload = async () => {
  const registration = await navigator.serviceWorker.getRegistration()
  const waiting = registration?.waiting
  if (waiting) {
    const activated = new Promise<void>(resolve => {
      waiting.addEventListener('statechange', () => {
        if (waiting.state === 'activated') resolve()
      })
    })
    waiting.postMessage({ type: 'SKIP_WAITING' })
    await activated
  }
  window.location.reload()
}

export const registerUpdates: RegisterUpdates = onUpdateReady => {
  registerSW({
    immediate: true,
    onNeedRefresh: () => onUpdateReady(activateAndReload),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return
      const check = () => {
        if (document.visibilityState === 'visible') registration.update()
      }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', check)
    },
  })
}
