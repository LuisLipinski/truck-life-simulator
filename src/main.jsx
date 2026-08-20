import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import MobileHelp from './components/MobileHelp.jsx'
import './styles.css'
import './phase1.css'
import './phase1-finance.css'
import './phase1-career.css'
import './react-tools.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <MobileHelp />
  </StrictMode>,
)
