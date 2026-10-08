/** Segmented control, e.g. Low / Medium / High or This week / All time. */
interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[12px] border border-border bg-bg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            'h-11 flex-1 rounded-[10px] t-small font-semibold transition-colors duration-150',
            value === o.value ? 'bg-surface text-primary shadow-card' : 'text-muted',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
