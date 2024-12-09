import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { rosters, teamMembers } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    // Get the current user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team from team members
    const userTeam = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: {
        team: true,
      },
    });

    if (!userTeam) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    // Get all rosters for the team
    const teamRosters = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, userTeam.teamId))
      .orderBy(desc(rosters.createdAt));

    return NextResponse.json(teamRosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rosters' }, 
      { status: 500 }
    );
  }
}