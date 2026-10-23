import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-spot text-spot-ink hover:bg-[#ffe066] active:bg-[#f2c623] font-semibold',
  secondary: 'bg-raised text-text border border-line hover:border-[#36636d] hover:bg-[#1b3940] font-medium',
  ghost: 'text-muted hover:text-text hover:bg-raised/70 font-medium',
  danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 font-medium',
};

const SIZES = {
  md: 'h-11 px-5 text-[15px] gap-2 rounded-[12px]',
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-[10px]',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-[14px]',
};

export function buttonClass(variant: Variant = 'primary', size: keyof typeof SIZES = 'md', extra = '') {
  return `inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:opacity-45 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZES;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-[spin_0.8s_linear_infinite]" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = 'primary', size = 'md', className = '', icon, children, ...rest }: LinkProps & { variant?: Variant; size?: keyof typeof SIZES; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function Toggle({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-text">{label}</span>
        {description && <span className="mt-0.5 block text-sm leading-snug text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-spot peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-spot" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-text shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-spot-ink" />
      </span>
    </label>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

export function Segmented<T extends string>({ value, onChange, options, label, wrap }: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; label: string; wrap?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1.5 rounded-[12px] bg-ink/60 p-1 ${wrap ? 'grid-cols-2 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none' : 'grid-flow-col auto-cols-fr'}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-w-0 rounded-[9px] px-2.5 py-2 text-center text-sm transition-colors ${active ? 'bg-raised text-text shadow-[inset_0_0_0_1px_#36636d]' : 'text-muted hover:text-text'}`}
          >
            <span className="block leading-tight font-medium text-balance">{o.label}</span>
            {o.hint && <span className={`mt-0.5 block text-xs leading-tight ${active ? 'text-spot' : 'text-faint'}`}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Swatches({ value, onChange, colors, label }: { value: string; onChange: (v: string) => void; colors: { id: string; name: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {colors.map((c) => {
        const active = c.id.toUpperCase() === value.toUpperCase();
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.id)}
            className={`size-8 rounded-full transition-transform ${active ? 'scale-110 ring-2 ring-text ring-offset-2 ring-offset-panel' : 'hover:scale-105'}`}
            style={{ background: c.id }}
          />
        );
      })}
    </div>
  );
}

export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-text">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-faint">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const tones = {
    info: 'border-line bg-raised/50 text-muted',
    warn: 'border-spot/30 bg-spot/[0.07] text-[#f3e3a6]',
    error: 'border-danger/40 bg-danger/[0.08] text-[#ffc4bb]',
    ok: 'border-mint/30 bg-mint/[0.07] text-[#c4f5e6]',
  };
  return <div className={`rounded-[12px] border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>;
}

export function formatTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--:--';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2).replace('.', ',')} GB`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoje, ${time}`;
  if (yesterday) return `Ontem, ${time}`;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
