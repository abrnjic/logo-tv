import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Check the installed app on every launch and reload when a newer worker activates.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    registration?.update().catch(console.error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
