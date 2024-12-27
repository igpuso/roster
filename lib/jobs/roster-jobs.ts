import { eventTrigger } from "@trigger.dev/sdk";
import { client } from '@/lib/triggers/trigger';
import { createShiftsFromJSON } from '@/lib/db/queries';

export const insertShiftsJob = client.defineJob({
  id: "insert-shifts-job",
  name: "Insert Shifts to Database",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "insert.shifts",
  }),
  run: async (payload, io) => {
    await io.logger.info("Starting shift insertion job", { payload });

    try {
      const result = await createShiftsFromJSON(payload.shifts);
      
      await io.logger.info("Shifts inserted successfully", { result });
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      await io.logger.error("Failed to insert shifts", { error });
      throw error;
    }
  },
});