import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const GiangHoPreview = lazy(() => import('./components/GiangHoPreview'));
const preview = new URLSearchParams(window.location.search).get('preview') === 'giang-ho';

const renderApp = () => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {preview ? <Suspense fallback={null}><GiangHoPreview /></Suspense> : <App />}
  </StrictMode>,
);

// Canvas textures rasterize text once; load the bundled font before the first board mounts.
if (document.fonts) {
  void document.fonts.load('700 32px "Xiangqi Han"').catch(() => []).then(renderApp);
} else {
  renderApp();
}
