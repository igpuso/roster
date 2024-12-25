// /app/(dashboard)/dashboard/roster/page.tsx
import { getUser, getRostersByTeam, getShiftsByTeam } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { RosterView } from './roster-view';

export default async function RosterPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const rosters = await getRostersByTeam(user.id);
  const defaultRosterId = rosters[0]?.id;
  const shifts = defaultRosterId ? await getShiftsByTeam(defaultRosterId) : [];

  const transformedShifts = shifts.map(shift => ({
    ...shift,
    userName: shift.userName ?? 'Unknown User',
    hours: Number(shift.hours)
  }));

  return <RosterView rosters={rosters} shifts={transformedShifts} />;
}