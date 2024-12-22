// /lib/actions/roster.ts

import { z } from 'zod';
import { db } from '../db/drizzle';
import { userAvailability, NewRoster, NewShift } from '../db/schema';
import { getUser } from '../db/queries'; // Adjust the import path as necessary
import { createRoster, createShift, updateShift as dbUpdateShift, getUserAvailability as dbGetUserAvailability } from '../db/queries';
// If you have error classes in a separate file, you can import them
// import { NotAuthenticatedError, PermissionDeniedError } from '../lib/errors';

// Error Classes (if not imported from elsewhere)
class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

class PermissionDeniedError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// Roster Schema
export const createRosterSchema = z.object({
  teamId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
});

export async function createRosterAction(data: z.infer<typeof createRosterSchema>) {
  const user = await getUser();
  if (!user) {
    throw new NotAuthenticatedError();
  }

  // Check if the user is an owner
  if (user.role !== 'owner') {
    throw new PermissionDeniedError('You do not have permission to create a roster');
  }

  try {
    const validatedData = createRosterSchema.parse(data);

    const rosterData: NewRoster = {
      teamId: validatedData.teamId,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      createdBy: user.id,
    };

    const [roster] = await createRoster(rosterData);

    return { success: true, data: roster };
  } catch (error) {
    console.error('Roster creation error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create roster',
    };
  }
}



// User Availability Schema
export const getUserAvailabilitySchema = z.object({
  userId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export async function getUserAvailabilityAction(params: z.infer<typeof getUserAvailabilitySchema>) {
  const user = await getUser();
  if (!user) {
    throw new NotAuthenticatedError();
  }

  try {
    const validatedParams = getUserAvailabilitySchema.parse(params);

    const availability = await dbGetUserAvailability(
      validatedParams.userId,
      new Date(validatedParams.startDate),
      new Date(validatedParams.endDate)
    );

    return { success: true, data: availability };
  } catch (error) {
    console.error('Get user availability error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to retrieve user availability',
    };
  }
}

// Create User Availability Schema
export const createUserAvailabilitySchema = z.object({
  userId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isAvailableAM: z.boolean(),
  isAvailablePM: z.boolean(),
  isAvailableNight: z.boolean(),
});

export async function createUserAvailabilityAction(data: z.infer<typeof createUserAvailabilitySchema>) {
  try {
    const user = await getUser();
    if (!user) {
      throw new NotAuthenticatedError();
    }

    // Users can update their own availability or owners can update any user's availability
    if (user.id !== data.userId && user.role !== 'owner') {
      throw new PermissionDeniedError('You do not have permission to set availability for this user');
    }

    const validatedData = createUserAvailabilitySchema.parse(data);

    const availabilityData = {
      userId: validatedData.userId,
      date: validatedData.date,
      isAvailableAM: validatedData.isAvailableAM,
      isAvailablePM: validatedData.isAvailablePM,
      isAvailableNight: validatedData.isAvailableNight,
    };

    // Add console.log to debug the data being inserted
    console.log('Inserting availability data:', availabilityData);

    const [availability] = await db
      .insert(userAvailability)
      .values(availabilityData)
      .onConflictDoUpdate({
        target: [userAvailability.userId, userAvailability.date],
        set: {
          isAvailableAM: availabilityData.isAvailableAM,
          isAvailablePM: availabilityData.isAvailablePM,
          isAvailableNight: availabilityData.isAvailableNight,
        },
      })
      .returning();

    // Add console.log to confirm successful insertion
    console.log('Inserted availability:', availability);

    return { success: true, data: availability };
  } catch (error) {
    // Improve error logging
    console.error('Create user availability error:', error);
    console.error('Error details:', {
    });
    
    return {
      error: error instanceof Error ? error.message : 'Failed to create user availability',
    };
  }
}