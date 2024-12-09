'use server'
import { createRoster, getTeamForUser, getUser } from '@/lib/db/queries';
import { NewRoster } from '@/lib/db/schema';
import { startOfDay } from 'date-fns';
import { format } from 'date-fns';

export async function createNewRoster(data: {
  startDate: Date;
  endDate: Date;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    const teamData = await getTeamForUser(user.id);
    if (!teamData) {
      return { success: false, error: 'Team not found' };
    }

    // Use format to create a date string without time zone conversion
    const rosterData: NewRoster = {
      teamId: teamData.id,
      startDate: format(startOfDay(data.startDate), 'yyyy-MM-dd'), // Formats as YYYY-MM-DD
      endDate: format(startOfDay(data.endDate), 'yyyy-MM-dd'),
      createdBy: user.id,
      createdAt: new Date(),
    };

    const roster = await createRoster(rosterData);
    return { success: true, data: roster[0] };
  } catch (error) {
    console.error('Error creating roster:', error);
    return { success: false, error: 'Failed to create roster' };
  }
}