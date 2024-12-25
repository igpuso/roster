import { desc, and, or, eq, isNull, gte, lte } from 'drizzle-orm';
import { db } from './drizzle';
import { 
  activityLogs, 
  teamMembers, 
  teams, 
  users,
  rosters,
  shifts,
  userAvailability, 
  NewShift,
  NewRoster 
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { decimal } from 'drizzle-orm/mysql-core';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser(userId: number) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      teamMembers: {
        with: {
          team: {
            with: {
              teamMembers: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      email: true,
                      position: true,
                      hourlyRate: true,
                      maxWeeklyHours: true,
                      minWeeklyHours: true,
                      seniority: true
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return result?.teamMembers[0]?.team || null;
}

// Add new roster management queries
export async function createRoster(data: NewRoster) {
  return await db.insert(rosters).values(data).returning();
}

export async function getRostersByTeam(userId: number) {
  // First get the user's team ID from teamMembers table
  const teamMember = await db
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (!teamMember.length) {
    throw new Error('User is not a member of any team');
  }

  return await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamMember[0].teamId))
    .orderBy(rosters.startDate);
}

export async function createShift(data: NewShift) {
  return await db.insert(shifts).values(data).returning();
}

export async function updateShift(id: number, data: Partial<NewShift>) {
  return await db
    .update(shifts)
    .set(data)
    .where(eq(shifts.id, id))
    .returning();
}

export async function getUserAvailability(userId: number, startDate: Date, endDate: Date) {
  return await db
    .select()
    .from(userAvailability)
    .where(
      and(
        eq(userAvailability.userId, userId),
        gte(userAvailability.date, startDate.toISOString().split('T')[0]),
        lte(userAvailability.date, endDate.toISOString().split('T')[0])
      )
    );
}

export async function getUsersWithAvailability(startDate: Date, endDate: Date) {
  const result = await db
    .select({
      userId: users.id,
      role: users.role,
      hourlyRate: users.hourlyRate,
      maxWeeklyHours: users.maxWeeklyHours,
      minWeeklyHours: users.minWeeklyHours,
      seniority: users.seniority,
      position: users.position,
      date: userAvailability.date,
      isAvailableAM: userAvailability.isAvailableAM,
      isAvailablePM: userAvailability.isAvailablePM,
      isAvailableNight: userAvailability.isAvailableNight,
    })
    .from(users)
    .leftJoin(
      userAvailability,
      eq(users.id, userAvailability.userId)
    )
    .where(
      and(
        isNull(users.deletedAt),
        //eq(users.role, 'member'),
        // Filter by date range
        gte(userAvailability.date, startDate.toISOString().split('T')[0]),
        lte(userAvailability.date, endDate.toISOString().split('T')[0])
      )
    );

  return result;
}

export async function createNewRoster(data: {
  startDate: Date;
  endDate: Date;
  createdBy: number;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const teamData = await getTeamForUser(user.id);
  if (!teamData) {
    throw new Error('Team not found');
  }

  // Convert Date objects to string in YYYY-MM-DD format
  const formattedStartDate = data.startDate.toISOString().split('T')[0];
  const formattedEndDate = data.endDate.toISOString().split('T')[0];

  return await db.insert(rosters).values({
    ...data,
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    teamId: teamData.id,
    createdAt: new Date(),
  }).returning();
}

// Also add a function to get all rosters
export async function getAllRosters(teamId: number) {
  return await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId))
    .orderBy(desc(rosters.createdAt));
}

export async function generateRoster(roster: any, availability: any) {
  try {
    const response = await fetch('/api/roster/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roster, availability }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate roster');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating roster:', error);
    throw error;
  }
}


interface ShiftInput {
  rosterId: number;
  userId: number;
  shiftType: string;
  date: string;
  startTime: string;
  finishTime: string;
  hours: number;
}

export async function createBatchShifts(shiftsData: ShiftInput[]) {
  try {
    // Transform input data to match the schema
    const transformedShifts = shiftsData.map(shift => ({
      rosterId: shift.rosterId,
      userId: shift.userId,
      shiftType: shift.shiftType,
      date: shift.date,
      startTime: shift.startTime,
      finishTime: shift.finishTime,
      hours: shift.hours.toFixed(2), // Convert number to string with 2 decimal places
    }));

    // Perform batch insert
    const createdShifts = await db.insert(shifts)
      .values(transformedShifts)
      .returning();

    return {
      success: true,
      data: createdShifts,
      message: `Successfully created ${createdShifts.length} shifts`
    };

  } catch (error) {
    console.error('Error creating shifts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create shifts'
    };
  }
}

// Helper function to validate shift data before insertion
export function validateShiftData(shiftsData: ShiftInput[]) {
  const errors: string[] = [];

  for (const [index, shift] of shiftsData.entries()) {
    // Check for required fields
    if (!shift.rosterId || !shift.userId || !shift.shiftType || !shift.date || 
        !shift.startTime || !shift.finishTime || shift.hours === undefined) {
      errors.push(`Shift at index ${index} is missing required fields`);
      continue;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(shift.date) || isNaN(Date.parse(shift.date))) {
      errors.push(`Invalid date format for shift at index ${index}. Expected YYYY-MM-DD`);
    }

    // Validate time format (HH:mm:ss)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(shift.startTime) || !timeRegex.test(shift.finishTime)) {
      errors.push(`Invalid time format for shift at index ${index}. Expected HH:mm:ss`);
    }

    // Validate shift type
    const validShiftTypes = ['AM', 'PM', 'NA'];
    if (!validShiftTypes.includes(shift.shiftType)) {
      errors.push(`Invalid shift type "${shift.shiftType}" for shift at index ${index}`);
    }

    // Validate hours (should be positive and within reasonable range)
    if (shift.hours <= 0 || shift.hours > 24) {
      errors.push(`Invalid hours value for shift at index ${index}. Must be between 0 and 24`);
    }

    // Validate decimal precision of hours
    const hoursStr = shift.hours.toString();
    const decimalPlaces = hoursStr.includes('.') ? hoursStr.split('.')[1].length : 0;
    if (decimalPlaces > 2) {
      errors.push(`Hours value at index ${index} has too many decimal places. Maximum is 2 decimal places`);
    }
  }

  return errors;
}

// Usage example:
export async function createShiftsFromJSON(shiftsData: ShiftInput[]) {
  // First validate the data
  const validationErrors = validateShiftData(shiftsData);
  
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors: validationErrors,
      message: 'Validation failed'
    };
  }

  // If validation passes, create the shifts
  return await createBatchShifts(shiftsData);
}

export async function getShiftsByTeam(rosterId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First get the user's team ID from teamMembers table
  const teamMember = await db
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!teamMember.length) {
    throw new Error('User is not a member of any team');
  }

  return await db
    .select({
      id: shifts.id,
      rosterId: shifts.rosterId,
      userName: users.name,
      shiftType: shifts.shiftType,
      date: shifts.date,
      startTime: shifts.startTime,
      finishTime: shifts.finishTime,
      hours: shifts.hours,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.userId, users.id))
    .leftJoin(rosters, eq(shifts.rosterId, rosters.id))
    .where(
      and(
        eq(rosters.teamId, teamMember[0].teamId),
        eq(shifts.rosterId, rosterId)
      )
    )
    .orderBy(shifts.date);
}