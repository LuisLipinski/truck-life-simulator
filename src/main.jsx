import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import MobileHelp from './components/MobileHelp.jsx'
import { AuthProvider } from './components/auth/AuthProvider.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { TutorialProvider } from './components/GuidedTutorial.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './styles.css'
import './auth.css'
import './phase1.css'
import './phase1-finance.css'
import './phase1-career.css'
import './phase1-charts.css'
import './react-tools.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <TutorialProvider>
            <App />
            <MobileHelp />
          </TutorialProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
