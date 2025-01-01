import { NextRequest, NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk/v3';
import type { generateAndInsertRosterTask } from '@/src/trigger/roster-generation';

// Change from default export to named export POST
export async function POST(req: NextRequest) {
  try {
    const { roster, availability } = await req.json();

    const handle = await tasks.trigger<typeof generateAndInsertRosterTask>("generate-and-insert-roster", {
      roster,
      availability
    });

    return NextResponse.json({ 
      taskId: handle.id,
      message: 'Roster generation task queued successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Error triggering roster generation task:', error);
    return NextResponse.json({ 
      message: 'Failed to trigger roster generation task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}