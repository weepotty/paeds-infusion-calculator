import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { data } from './data'

registerSW({ immediate: true })

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App data={data} />
    </StrictMode>,
  )
}
