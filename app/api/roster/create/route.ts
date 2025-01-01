import { NextResponse } from 'next/server';
import { startOfDay } from 'date-fns';
import { createNewRoster } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDate = startOfDay(new Date(body.startDate));
    const endDate = startOfDay(new Date(body.endDate));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const roster = await createNewRoster({ startDate, endDate });
    return NextResponse.json({ success: true, data: roster });
  } catch (error) {
    console.error('Error in roster creation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create roster'
      },
      { status: 500 }
    );
  }
}