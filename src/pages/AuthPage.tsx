import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, FieldLabel, Notice } from '../components/ui';
import { AuthError, backend } from '../lib/backend';

const PHRASES = [
  ['Você', 'grava', 'do', 'seu', 'jeito.'],
  ['A', 'Tribuna', 'corta', 'as', 'pausas,'],
  ['escreve', 'as', 'legendas'],
  ['e', 'entrega', 'pronto', 'para', 'postar.'],
];

/** Uma legenda "falando" sozinha: é a própria cara do produto. */
function KaraokeCaption() {
  const [step, setStep] = useState({ phrase: 0, word: 0 });
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setStep(({ phrase, word }) => {
        if (word < PHRASES[phrase].length) return { phrase, word: word + 1 };
        return { phrase: (phrase + 1) % PHRASES.length, word: 0 };
      });
    }, 360);
    return () => window.clearInterval(id);
  }, []);
  const words = PHRASES[step.phrase];
  return (
    <p key={step.phrase} className="flex min-h-[2.6em] flex-wrap items-center justify-center gap-x-[0.28em] gap-y-1 text-center font-display text-[clamp(30px,4.2vw,54px)] leading-[1.08] font-extrabold tracking-[-0.02em] animate-[pop_0.22s_ease-out]">
      {words.map((w, i) => {
        const active = i === Math.min(step.word, words.length - 1) && step.word < words.length;
        return (
          <span key={i} className={`rounded-[0.16em] px-[0.14em] transition-colors duration-150 ${active ? 'bg-spot text-spot-ink' : i < step.word ? 'text-text' : 'text-text/35'}`}>
            {w}
          </span>
        );
      })}
    </p>
  );
}

/** Forma de onda com os trechos de silêncio "recortados". */
function Waveform() {
  const bars = Array.from({ length: 64 }, (_, i) => {
    const silent = (i > 17 && i < 23) || (i > 40 && i < 45);
    const h = silent ? 3 : 8 + Math.abs(Math.sin(i * 1.7) * 18 + Math.sin(i * 0.6) * 9);
    return { h, silent };
  });
  return (
    <svg viewBox="0 0 320 44" className="h-11 w-full max-w-sm" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={i * 5} y={22 - b.h / 2} width="3" height={b.h} rx="1.5" fill={b.silent ? '#305961' : '#eaf2ef'} opacity={b.silent ? 1 : 0.85} />
      ))}
      <rect x="88" y="2" width="27" height="40" rx="6" fill="none" stroke="#ffd43b" strokeDasharray="3 4" />
      <rect x="203" y="2" width="22" height="40" rx="6" fill="none" stroke="#ffd43b" strokeDasharray="3 4" />
    </svg>
  );
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function AuthPage({ mode }: { mode: 'login' | 'signup' | 'reset' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setDone(null);
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && !name.trim()) return setError('Digite seu nome.');
    if (!emailOk(email)) return setError('Digite um e-mail válido.');
    if (mode !== 'reset' && password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    setBusy(true);
    try {
      if (mode === 'login') await backend.signIn(email, password);
      else if (mode === 'signup') {
        const { needsConfirmation } = await backend.signUp(name, email, password);
        if (needsConfirmation) setDone(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail para ativar sua conta.`);
      } else {
        await backend.resetPassword(email);
        setDone(`Se existir uma conta com ${email.trim()}, você vai receber um link para criar uma nova senha.`);
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Não foi possível concluir agora. Verifique sua conexão e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    login: { h: 'Entrar na sua conta', p: 'Seus projetos estão esperando por você.', cta: 'Entrar' },
    signup: { h: 'Criar sua conta', p: 'Cada conta tem os próprios projetos e vídeos.', cta: 'Criar conta' },
    reset: { h: 'Recuperar a senha', p: 'Enviamos um link para você criar uma senha nova.', cta: 'Enviar link' },
  }[mode];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="stage-light relative flex flex-col justify-between overflow-hidden px-6 pt-6 pb-8 sm:px-10 lg:m-3 lg:rounded-[28px] lg:px-12 lg:py-10">
        <Logo />
        <div className="py-10 lg:py-0">
          <KaraokeCaption />
        </div>
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <Waveform />
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">Envie o vídeo do jeito que gravou. Ele volta sem as pausas, com legenda e vinheta.</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-[32px] leading-tight font-bold tracking-[-0.02em]">{titles.h}</h1>
          <p className="mt-2 text-muted">{titles.p}</p>

          {done ? (
            <div className="mt-8 space-y-6">
              <Notice tone="ok">{done}</Notice>
              <Link to="/entrar" className="inline-block text-sm font-medium text-spot hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              {mode === 'signup' && (
                <div>
                  <FieldLabel htmlFor="name">Nome</FieldLabel>
                  <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar" />
                </div>
              )}
              <div>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <input id="email" className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
              </div>
              {mode !== 'reset' && (
                <div>
                  <FieldLabel
                    htmlFor="password"
                    hint={
                      mode === 'login' && backend.mode === 'supabase' ? (
                        <Link to="/recuperar-senha" className="text-sm text-muted hover:text-text">
                          Esqueci minha senha
                        </Link>
                      ) : mode === 'signup' ? (
                        'Pelo menos 6 caracteres'
                      ) : undefined
                    }
                  >
                    Senha
                  </FieldLabel>
                  <div className="relative">
                    <input
                      id="password"
                      className="field pr-12"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-text"
                      aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
                    >
                      {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={busy}>
                {titles.cta}
              </Button>

              <p className="text-center text-sm text-muted">
                {mode === 'login' ? (
                  <>
                    Ainda não tem conta?{' '}
                    <Link to="/criar-conta" className="font-medium text-spot hover:underline">
                      Criar conta
                    </Link>
                  </>
                ) : (
                  <>
                    Já tem conta?{' '}
                    <Link to="/entrar" className="font-medium text-spot hover:underline">
                      Entrar
                    </Link>
                  </>
                )}
              </p>
            </form>
          )}

          {backend.mode === 'local' && (
            <p className="mt-10 border-t border-line-soft pt-4 text-xs leading-relaxed text-faint">
              Modo local: as contas e os projetos ficam guardados neste navegador. Para contas na nuvem, configure o Supabase (veja o README).
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
