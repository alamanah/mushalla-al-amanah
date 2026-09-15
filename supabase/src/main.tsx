import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Update service worker otomatis di latar belakang setiap kali ada versi baru,
// tanpa perlu user menutup-buka app (aman karena tidak ada state offline yang perlu dijaga).
registerSW({ immediate: true })
