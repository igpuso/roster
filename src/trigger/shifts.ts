// src/trigger/shifts.ts
import { task } from "@trigger.dev/sdk/v3";
import { createShiftsFromJSON } from "@/lib/db/queries";

export const insertShiftsTask = task({
  id: "insert-shifts-task",
  // The task will automatically use the retry configuration from trigger.config.ts
  run: async (payload: { shifts: any }) => {
    try {
      const result = await createShiftsFromJSON(payload.shifts);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to insert shifts');
      }

      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      // The error will be automatically handled by the retry configuration
      throw error;
    }
  },
});