import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import MobileHelp from './components/MobileHelp.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './styles.css'
import './phase1.css'
import './phase1-finance.css'
import './phase1-career.css'
import './phase1-charts.css'
import './react-tools.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
        <MobileHelp />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
