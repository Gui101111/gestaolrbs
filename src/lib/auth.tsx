import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { backend } from './backend';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let alive = true;
    backend.currentUser().then(
      (user) => alive && setState({ user, loading: false }),
      () => alive && setState({ user: null, loading: false }),
    );
    const off = backend.onAuthChange((user) => setState({ user, loading: false }));
    return () => {
      alive = false;
      off();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
