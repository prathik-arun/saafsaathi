/** "See all" activity page. */
import { useProfile } from '../auth/AuthProvider';
import { ActivityList } from './ActivityList';

export default function Activity() {
  const profile = useProfile();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <ActivityList uid={profile.id} max={100} />
    </div>
  );
}
