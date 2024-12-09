import { NextResponse } from 'next/server';
import { startOfDay } from 'date-fns';
import { createNewRoster } from '@/app/api/roster/createRoster';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Parse the dates using startOfDay to ensure consistent time
    const startDate = startOfDay(new Date(body.startDate));
    const endDate = startOfDay(new Date(body.endDate));

    // Validate dates
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

    // Call the server action to create the roster
    const result = await createNewRoster({
      startDate,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in roster creation:', error);
    return NextResponse.json(
      { error: 'Failed to create roster' },
      { status: 500 }
    );
  }
}