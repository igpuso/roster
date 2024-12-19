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

export async function getRostersByTeam(teamId: number) {
  return await db.query.rosters.findMany({
    where: eq(rosters.teamId, teamId),
    with: {
      shifts: {
        with: {
          user: true,
        },
      },
    },
  });
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