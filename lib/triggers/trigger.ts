import { TriggerClient } from "@trigger.dev/sdk";

export const client = new TriggerClient({
    id: "proj_gcorrdcsbyxbapsacxsr",
    apiKey: process.env.TRIGGER_SECRET_KEY,
  });