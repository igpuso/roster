import { NextResponse } from 'next/server';
import { getShiftsByTeam } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rosterId = searchParams.get('rosterId');

    if (!rosterId) {
      return NextResponse.json({ error: 'Roster ID is required' }, { status: 400 });
    }

    const shifts = await getShiftsByTeam(Number(rosterId));
    
    const transformedShifts = shifts.map(shift => ({
      ...shift,
      userName: shift.userName ?? 'Unknown User',
      hours: Number(shift.hours)
    }));

    return NextResponse.json({ shifts: transformedShifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}