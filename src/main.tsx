import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/base.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { data } from './data'
import { registerUpdates } from './update'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App data={data} registerUpdates={registerUpdates} />
    </StrictMode>,
  )
}
