import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import CreateRosterClient from './create-roster-form';

export default async function CreateRosterPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (user.role !== 'owner') {
    return <div>Access denied. Only owners can view this page.</div>;
  }

  return <CreateRosterClient />;
}