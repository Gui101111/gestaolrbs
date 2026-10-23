import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AuthPage } from './pages/AuthPage';
import { NewVideoPage } from './pages/NewVideoPage';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectsPage } from './pages/ProjectsPage';

function Splash() {
  return <div className="min-h-dvh stage-light" aria-busy="true" />;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/projetos'} replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/criar-conta" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
      <Route path="/recuperar-senha" element={<GuestOnly><AuthPage mode="reset" /></GuestOnly>} />
      <Route path="/projetos" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/novo" element={<RequireAuth><NewVideoPage /></RequireAuth>} />
      <Route path="/projeto/:id" element={<RequireAuth><ProjectPage /></RequireAuth>} />
      <Route path="/projeto/:id/ajustar" element={<RequireAuth><NewVideoPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/projetos" replace />} />
    </Routes>
  );
}
