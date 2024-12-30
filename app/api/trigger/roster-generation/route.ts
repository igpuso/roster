// pages/api/trigger/roster-generation.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { tasks } from '@trigger.dev/sdk/v3';
import type { generateAndInsertRosterTask } from '@/src/trigger/roster-generation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { roster, availability } = req.body;

    // Trigger the task using the v3 tasks API - passing the payload directly
    const handle = await tasks.trigger<typeof generateAndInsertRosterTask>("generate-and-insert-roster", {
      roster,
      availability
    });

    return res.status(200).json({ 
      taskId: handle.id,
      message: 'Roster generation task queued successfully' 
    });
  } catch (error) {
    console.error('Error triggering roster generation task:', error);
    return res.status(500).json({ 
      message: 'Failed to trigger roster generation task',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}