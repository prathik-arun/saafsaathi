/** Empty state: simple line illustration, one sentence, one button. */
import type { ReactNode } from 'react';
import { Button } from './Button';
import { EmptyIllustration } from './Illustrations';

interface Props {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: ReactNode;
}

export function EmptyState({ text, actionLabel, onAction, illustration }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      {illustration ?? <EmptyIllustration />}
      <p className="t-body text-muted">{text}</p>
      {actionLabel && onAction && (
        <Button variant="primary" block={false} onClick={onAction} className="px-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
