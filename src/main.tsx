import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/base.css'
import './styles/shell.css'
import './styles/home.css'
import './styles/players.css'
import './styles/teams.css'
import './styles/games.css'
import './styles/battle.css'
import './styles/dex.css'
import './styles/how.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
