// app/api/trigger/queue-shifts/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/triggers/trigger';

export async function POST(request: Request) {
  try {
    const { roster, availability } = await request.json();
    console.log('Queue Shifts API - Received roster and availability data:', { roster, availability });

    // Trigger the background job
    const job = await client.sendEvent({
      name: "generate.and.insert.roster",
      payload: {
        roster,
        availability
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