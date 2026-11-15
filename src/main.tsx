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
