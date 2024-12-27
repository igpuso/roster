import { NextResponse } from 'next/server';
import { client } from '@/lib/triggers/trigger';

export async function POST(request: Request) {
  try {
    const { shifts } = await request.json();
    console.log('Queue Shifts API - Received shifts data:', shifts);

    // Trigger the background job
    const job = await client.sendEvent({
      name: "insert.shifts",
      payload: {
        shifts: shifts
      }
    });

    console.log('Queue Shifts API - Job created:', job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id
    });

  } catch (error) {
    console.error('Error queuing shift insertion job:', error);
    return NextResponse.json(
      { error: 'Failed to queue shift insertion' },
      { status: 500 }
    );
  }
}