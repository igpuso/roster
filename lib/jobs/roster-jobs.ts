import { eventTrigger } from "@trigger.dev/sdk";
import { client } from '@/lib/triggers/trigger';
import { createShiftsFromJSON } from '@/lib/db/queries';

export const insertShiftsJob = client.defineJob({
  id: "insert-shifts-job",
  name: "Insert Shifts to Database",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "insert.shifts", // Match this with the name in queue-shifts/route.ts
  }),
  run: async (payload, io) => {
    await io.logger.info("Starting shift insertion job", { 
      shiftsCount: payload.shifts?.length 
    });

    try {
      if (!payload.shifts || !Array.isArray(payload.shifts)) {
        throw new Error('Invalid shifts data in payload');
      }

      const result = await createShiftsFromJSON(payload.shifts);
      
      await io.logger.info("Shifts inserted successfully", { 
        insertedShifts: result 
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      await io.logger.error("Failed to insert shifts", { error });
      throw error;
    }
  },
});