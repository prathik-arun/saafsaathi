/** Cities: recolour, view members (and make a member City Captain). */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Sheet } from '../../components/Sheet';
import { SkeletonCards } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { db } from '../../lib/firebase';
import { num } from '../../lib/format';
import type { UserDoc, WithId } from '../../lib/types';
import { useCities, type CityRecord } from '../leaderboard/useCities';
import { cityName } from '../../lib/cities';
import { currentLanguage } from '../../lib/i18n';
import { setRole, updateCity } from './adminApi';

export function CitiesAdmin() {
  const { cities, loading } = useCities();
  if (loading) return <SkeletonCards count={4} />;
  return (
    <div className="flex flex-col gap-3">
      {cities.map((c) => (
        <CityEditor key={c.id} city={c} />
      ))}
    </div>
  );
}

function CityEditor({ city }: { city: CityRecord }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [colour, setColour] = useState(city.colour);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<WithId<UserDoc>[] | null>(null);
  const [open, setOpen] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateCity(city.id, { colour });
      toast.success(t('admin.saved'));
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const showMembers = async () => {
    setOpen(true);
    const snap = await getDocs(query(collection(db, 'users'), where('cityId', '==', city.id)));
    setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) })).sort((a, b) => b.points - a.points));
  };

  return (
    <Card stripe={colour} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          aria-label={t('admin.colour')}
          className="h-11 w-11 cursor-pointer rounded-full border border-border"
        />
        <span className="flex-1 t-strong">{cityName(city.id, currentLanguage())}</span>
      </div>
      <p className="t-caption text-muted">
        {num(city.points)} {t('common.ptsShort')} · {t('setup.members', { count: city.memberCount })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-11 min-h-11" onClick={save} loading={saving}>
          {t('admin.save')}
        </Button>
        <Button variant="secondary" className="h-11 min-h-11" onClick={showMembers}>
          {t('admin.members')}
        </Button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={`${cityName(city.id, currentLanguage())}: ${t('admin.members')}`}>
        {!members ? (
          <SkeletonCards count={3} height="h-12" />
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.nickname} color={city.colour} size={36} />
                <span className="flex-1">
                  <span className="block t-strong">{m.nickname}</span>
                  <span className="t-caption text-muted">
                    {t(`admin.role.${m.role}`)} · {num(m.points)} {t('common.ptsShort')}
                  </span>
                </span>
                {m.role === 'member' && (
                  <Button
                    variant="ghost"
                    className="px-2 t-small"
                    onClick={() => setRole(m.id, 'captain').then(() => setMembers((list) => list!.map((x) => (x.id === m.id ? { ...x, role: 'captain' } : x))))}
                  >
                    {t('admin.makeCaptain')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </Card>
  );
}
