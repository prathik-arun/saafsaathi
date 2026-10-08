/** Skeleton placeholders shown while lists and cards load (no spinners). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-[12px] ${className}`} aria-hidden />;
}

export function SkeletonCards({ count = 3, height = 'h-20' }: { count?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${height} w-full rounded-[16px]`} />
      ))}
    </div>
  );
}
