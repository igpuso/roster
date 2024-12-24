//app/api/roster/shifts/route.ts

import { NextResponse } from 'next/server';
import { createShiftsFromJSON } from '@/lib/db/queries';

interface ShiftInput {
  rosterId: number;
  userId: number;
  shiftType: string;
  date: string;
  startTime: string;
  finishTime: string;
  hours: number;
}

export async function POST(request: Request) {
  try {
    const shiftsData: ShiftInput[] = await request.json();
    const result = await createShiftsFromJSON(shiftsData);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create shifts', 
          details: result.success && result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error saving shifts:', error);
    return NextResponse.json(
      { error: 'Failed to save shifts' },
      { status: 500 }
    );
  }
}