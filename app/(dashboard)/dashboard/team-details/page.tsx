// app/(dashboard)/dashboard/team/page.tsx
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { TeamDetailsForm } from './team-details-form';
import { redirect } from 'next/navigation';

export default async function TeamDetailsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  if (user.role !== 'owner') {
    return <div>Access denied. Only owners can view this page.</div>;
  }

  const teamData = await getTeamForUser(user.id);
  
  if (!teamData) {
    return <div>No team found</div>;
  }

  return <TeamDetailsForm teamData={teamData} />;
}