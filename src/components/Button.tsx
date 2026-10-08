/**
 * Button with the PRD variants: primary, secondary, ghost, accent, danger.
 * Every button has a pressed state (darker + scale 0.98), a disabled state
 * (40% opacity) and a loading state (spinner replaces the label, same width).
 */
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-pressed active:bg-primary-pressed shadow-card',
  secondary: 'bg-surface text-primary border-[1.5px] border-primary hover:bg-primary-soft active:bg-primary-soft',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft active:bg-primary-soft h-11 min-h-11',
  accent: 'bg-accent text-white hover:brightness-95 active:brightness-90 shadow-card',
  danger: 'bg-error text-white hover:brightness-95 active:brightness-90 shadow-card',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  /** Full width (default true for every variant except ghost). */
  block?: boolean;
}

export function Button({ variant = 'primary', loading, icon, block, className = '', children, disabled, ...rest }: Props) {
  const full = block ?? variant !== 'ghost';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'relative inline-flex items-center justify-center gap-2 rounded-[12px] px-4 font-semibold t-body',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        'disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed disabled:hover:bg-[unset] disabled:hover:brightness-100',
        variant === 'ghost' ? '' : 'h-[52px] min-h-[52px]',
        full ? 'w-full' : '',
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {/* Keep the label in the layout while loading so the width stays fixed. */}
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
        {icon}
        {children}
      </span>
      {loading && <Loader2 aria-hidden className="absolute h-5 w-5 animate-spin" />}
    </button>
  );
}

/** 44 px round icon button (flash, flip camera, close, my location). Always needs a label. */
export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-11 w-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface text-text',
        'transition duration-150 ease-out hover:brightness-95 active:scale-95 disabled:opacity-40',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
