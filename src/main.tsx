/** React entry: mounts <App/> and pulls in the stylesheet layers. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './dev/mock' // dev-only visual harness (no-op unless ?mock=1)
import App from './App'

// Stylesheet order matters: tokens first, then globals, then the notch.
import './styles/tokens.css'
import './styles/global.css'
import './styles/notch.css'
import './styles/analytics.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root element not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
