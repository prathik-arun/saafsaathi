/** Error state for a card or list that failed to load: message plus Try again. */
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Card } from './Card';

export function ErrorCard({ onRetry, text }: { onRetry: () => void; text?: string }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col items-center gap-3 text-center" role="alert">
      <AlertCircle className="h-8 w-8 text-error" aria-hidden />
      <p className="t-small text-muted">{text ?? t('common.loadError')}</p>
      <Button variant="secondary" onClick={onRetry} block={false} className="px-6">
        {t('common.tryAgain')}
      </Button>
    </Card>
  );
}
