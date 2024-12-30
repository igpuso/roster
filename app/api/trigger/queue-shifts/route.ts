import { NextResponse } from 'next/server';
import { client } from '@/lib/triggers/trigger';

export async function POST(request: Request) {
  try {
    const { roster, availability, generatedShifts } = await request.json();
    
    console.log('Queue Shifts API - Received data:', { 
      rosterId: roster?.id,
      availabilityCount: availability?.length,
      shiftsCount: generatedShifts?.length 
    });

    if (!generatedShifts || !Array.isArray(generatedShifts)) {
      throw new Error('Invalid shifts data received');
    }

    // Make sure each shift has a rosterId
    const shiftsWithRosterId = generatedShifts.map(shift => ({
      ...shift,
      rosterId: shift.rosterId || roster.id
    }));

    // Trigger the background job
    const job = await client.sendEvent({
      name: "insert.shifts",
      payload: {
        rosterId: roster.id,
        shifts: shiftsWithRosterId
      }
    });

    console.log('Queue Shifts API - Job created:', job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id
    });

  } catch (error) {
    console.error('Error queuing roster generation job:', error);
    return NextResponse.json(
      { error: 'Failed to queue roster generation' },
      { status: 500 }
    );
  }
}