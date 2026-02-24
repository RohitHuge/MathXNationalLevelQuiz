import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './round1/index.css' // We can initially just load round1's index.css which has the tailwind setup
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
