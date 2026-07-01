import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { FontProvider } from './hooks/useFonts';
import { PageFormatProvider } from './hooks/usePageFormats';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { WorksPage } from './pages/WorksPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { ContactsPage } from './pages/ContactsPage';
import { ExhibitionsPage } from './pages/ExhibitionsPage';

const GeneratePage = lazy(() => import('./pages/GeneratePage').then((m) => ({ default: m.GeneratePage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then((m) => ({ default: m.EditorPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="empty-state" style={{ minHeight: '12rem' }}>
      <p>Chargement…</p>
    </div>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <FontProvider>
        <PageFormatProvider>
        <BrowserRouter
        basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="oeuvres" element={<WorksPage />} />
            <Route path="artistes" element={<ArtistsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="expositions" element={<ExhibitionsPage />} />
            <Route
              path="generer"
              element={
                <Suspense fallback={<PageLoader />}>
                  <GeneratePage />
                </Suspense>
              }
            />
            <Route
              path="editeur"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditorPage />
                </Suspense>
              }
            />
            <Route
              path="parametres"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
        </PageFormatProvider>
      </FontProvider>
    </SettingsProvider>
  );
}
