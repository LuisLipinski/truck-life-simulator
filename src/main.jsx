import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import BackendLoadingOverlay from './components/BackendLoadingOverlay.jsx'
import BackendLoadingRetryFallback from './components/BackendLoadingRetryFallback.jsx'
import MobileHelp from './components/MobileHelp.jsx'
import { AuthProvider } from './components/auth/AuthProvider.jsx'
import CareerServerProvider from './components/auth/CareerServerProvider.jsx'
import SessionNavigation from './components/auth/SessionNavigation.jsx'
import SessionRouter from './components/auth/SessionRouter.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { TutorialProvider } from './components/GuidedTutorial.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './styles.css'
import './auth.css'
import './session.css'
import './backend-loading.css'
import './phase1.css'
import './phase1-finance.css'
import './phase1-career.css'
import './phase1-charts.css'
import './react-tools.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CareerServerProvider>
        <ToastProvider>
          <ConfirmProvider>
            <TutorialProvider>
              <BackendLoadingOverlay />
              <BackendLoadingRetryFallback />
              <SessionNavigation />
              <SessionRouter>
                <App />
                <MobileHelp />
              </SessionRouter>
            </TutorialProvider>
          </ConfirmProvider>
        </ToastProvider>
      </CareerServerProvider>
    </AuthProvider>
  </StrictMode>,
)
