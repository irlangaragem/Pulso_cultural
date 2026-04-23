import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'  // Design system tokens — must be first
import './index.css'
import App from './App.tsx'

window.addEventListener('error', (event) => {
  console.error('Global Error Captured:', event.error);
});

import { LanguageProvider } from './contexts/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </BrowserRouter>,
)
