/** Admin (PRD 4.13), only for users with role "admin". */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../components/Chip';
import { useProfile } from '../auth/AuthProvider';
import { ContentAdmin } from './ContentAdmin';
import { FlaggedPhotos } from './FlaggedPhotos';
import { CitiesAdmin } from './CitiesAdmin';
import { ReportsQueue } from './ReportsQueue';
import { StatsDashboard } from './StatsDashboard';

const TABS = ['queue', 'flagged', 'cities', 'content', 'stats'] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const { t } = useTranslation();
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>('queue');
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((k) => (
          <Chip key={k} selected={tab === k} onClick={() => setTab(k)}>
            {t(`admin.tab.${k}`)}
          </Chip>
        ))}
      </div>
      {tab === 'queue' && <ReportsQueue />}
      {tab === 'flagged' && <FlaggedPhotos />}
      {tab === 'cities' && <CitiesAdmin />}
      {tab === 'content' && <ContentAdmin />}
      {tab === 'stats' && <StatsDashboard />}
    </div>
  );
}
