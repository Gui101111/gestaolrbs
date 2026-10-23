import { LogOut, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backend } from '../lib/backend';
import { useAuth } from '../lib/auth';
import { hasRunningJobs } from '../lib/pipeline/job';
import { Logo } from './Logo';
import { ButtonLink } from './ui';

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!user) return null;
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  const signOut = async () => {
    if (hasRunningJobs() && !window.confirm('Há um vídeo sendo editado. Sair agora interrompe a edição. Quer sair mesmo assim?')) return;
    await backend.signOut();
    navigate('/entrar');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menu da conta"
        className="flex size-10 items-center justify-center rounded-full bg-raised font-display text-[17px] font-bold text-spot ring-1 ring-line transition hover:ring-[#36636d]"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[14px] border border-line bg-panel shadow-2xl shadow-black/40">
          <div className="border-b border-line-soft px-4 py-3">
            <p className="truncate text-[15px] font-semibold">{user.name || 'Sua conta'}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            {backend.mode === 'local' && <p className="mt-2 text-xs leading-snug text-faint">Conta salva neste navegador.</p>}
          </div>
          <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[15px] text-text hover:bg-raised">
            <LogOut className="size-4 text-muted" aria-hidden />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, showNew = true }: { children: ReactNode; showNew?: boolean }) {
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (hasRunningJobs()) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line-soft bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/projetos" aria-label="Tribuna, ir para projetos">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {showNew && (
              <ButtonLink to="/novo" size="sm" icon={<Plus className="size-4" aria-hidden />}>
                Novo vídeo
              </ButtonLink>
            )}
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
