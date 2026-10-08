/** Card: surface colour, 16 px radius and padding, optional left colour stripe. */
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** CSS colour for the left stripe, e.g. "var(--wet)" or a city colour. */
  stripe?: string;
}

export function Card({ stripe, className = '', style, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`relative overflow-hidden rounded-[16px] border border-border bg-surface p-4 shadow-card ${className}`}
      style={{ ...style, ...(stripe ? { borderLeft: `4px solid ${stripe}` } : {}) }}
    >
      {children}
    </div>
  );
}
