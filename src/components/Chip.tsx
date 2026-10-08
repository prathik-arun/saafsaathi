/** Chips: 32 px tall, caption text, soft fill. Selected chips use primary-soft. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

/** A tappable filter/choice chip. */
export function Chip({ selected, icon, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={[
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 t-caption whitespace-nowrap',
        'transition-colors duration-150 ease-out',
        selected ? 'bg-primary-soft text-primary border border-primary' : 'bg-surface text-muted border border-border hover:border-primary hover:text-text',
        className,
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  );
}

/** A non-interactive label chip with custom colours. */
export function Tag({
  color,
  bg,
  icon,
  children,
  className = '',
  size = 'sm',
}: {
  color: string;
  bg: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        size === 'lg' ? 'h-11 px-4 t-h2' : 'h-7 px-2.5 t-caption',
        className,
      ].join(' ')}
      style={{ color, background: bg }}
    >
      {icon}
      {children}
    </span>
  );
}
