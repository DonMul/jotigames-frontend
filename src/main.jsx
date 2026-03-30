import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './styles.css'

function ensureWsTransportLoaded() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  if (window.JotiWs && typeof window.JotiWs.connect === 'function') {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-joti-ws-transport="1"]')
    if (existing) {
      if (window.JotiWs && typeof window.JotiWs.connect === 'function') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => resolve(), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = '/assets/scripts/ws_transport.js'
    script.async = false
    script.dataset.jotiWsTransport = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => resolve(), { once: true })
    document.body.appendChild(script)
  })
}

async function bootstrap() {
  await ensureWsTransportLoaded()

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}

bootstrap()
