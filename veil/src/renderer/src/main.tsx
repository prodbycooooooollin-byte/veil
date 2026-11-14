import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import Overlay from './pages/Overlay'

const isOverlay = location.hash === '#overlay'
if (isOverlay) document.documentElement.classList.add('overlay')

createRoot(document.getElementById('root')!).render(<StrictMode>{isOverlay ? <Overlay /> : <App />}</StrictMode>)
