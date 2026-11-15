import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { HaloProvider } from './state/store'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HaloProvider>
      <App />
    </HaloProvider>
  </React.StrictMode>,
)

// Installable offline app (PWA). Only on a real http(s) origin, not in a frame, not in the single-file build.
declare const __SINGLE__: boolean
if (!__SINGLE__ && import.meta.env.PROD && typeof window !== 'undefined' && /^https?:$/.test(location.protocol) && window.top === window.self) {
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = './manifest.webmanifest'; document.head.appendChild(link)
  const apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; apple.href = './icon-192.png'; document.head.appendChild(apple)
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline install is optional */ }) })
}
