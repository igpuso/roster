'use server'
import { createNewRoster } from '@/lib/db/queries';

export async function handleRosterCreation(data: {
  startDate: Date;
  endDate: Date;
}) {
  try {
    const roster = await createNewRoster(data);
    return { success: true, data: roster };
  } catch (error) {
    console.error('Error creating roster:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create roster' 
    };
  }
}