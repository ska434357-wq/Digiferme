import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// Register PWA service worker non-blockingly after mount
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    registerSW({
      immediate: false,
      onNeedRefresh() {
        console.log('FermeFacile PWA: Nouvelle mise à jour disponible.');
      },
      onOfflineReady() {
        console.log('FermeFacile PWA: Prêt pour le fonctionnement 100% hors-ligne.');
      },
      onRegisterError(error) {
        console.warn('FermeFacile PWA: Enregistrement SW ignoré:', error);
      },
    });
  }
} catch (err) {
  console.warn('FermeFacile PWA: Service worker non disponible dans ce contexte.', err);
}
