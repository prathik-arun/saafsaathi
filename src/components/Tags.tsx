/** Ready-made chips for category, status, report type, severity and city. */
import { useTranslation } from 'react-i18next';
import type { ReportStatus, ReportType, Severity, WasteLabel } from '../lib/types';
import { Tag } from './Chip';
import { CATEGORY_META, REPORT_TYPE_META, SEVERITY_META, STATUS_META, softOf } from './meta';
import { cityName } from '../lib/cities';
import { currentLanguage } from '../lib/i18n';
import { useCities } from '../features/leaderboard/useCities';

export function CategoryTag({ category, size = 'sm' }: { category: WasteLabel; size?: 'sm' | 'lg' }) {
  const { t } = useTranslation();
  const m = CATEGORY_META[category];
  return (
    <Tag color={m.color} bg={m.soft} size={size} icon={<m.Icon className={size === 'lg' ? 'h-6 w-6' : 'h-3.5 w-3.5'} aria-hidden />}>
      {t(m.key).toUpperCase()}
    </Tag>
  );
}

export function StatusTag({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  const m = STATUS_META[status];
  return (
    <Tag color={m.color} bg={softOf(m.color)} icon={<m.Icon className="h-3.5 w-3.5" aria-hidden />}>
      {t(m.key)}
    </Tag>
  );
}

export function TypeTag({ type }: { type: ReportType }) {
  const { t } = useTranslation();
  const m = REPORT_TYPE_META[type];
  return (
    <Tag color="var(--text)" bg="var(--bg)" icon={<m.Icon className="h-3.5 w-3.5" aria-hidden />}>
      {t(m.key)}
    </Tag>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const { t } = useTranslation();
  const m = SEVERITY_META[severity];
  return (
    <Tag color={m.color} bg={softOf(m.color)}>
      {t('severity.label')}: {t(m.key)}
    </Tag>
  );
}

export function CityTag({ cityId }: { cityId: string }) {
  useTranslation(); // re-render when the language changes
  const { colourOf } = useCities();
  if (!cityId) return null;
  const colour = colourOf(cityId);
  return (
    <Tag color={colour} bg={softOf(colour)}>
      {cityName(cityId, currentLanguage())}
    </Tag>
  );
}
