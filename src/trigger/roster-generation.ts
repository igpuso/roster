// src/trigger/roster-generation.ts
import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createShiftsFromJSON } from "@/lib/db/queries";
import fs from "fs";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Read the prompt file
const promptFilePath = path.resolve(process.cwd(), "prompts/Roster_Generation_Prompt.md");
const basePrompt = fs.readFileSync(promptFilePath, "utf-8");

export const generateAndInsertRosterTask = task({
  id: "generate-and-insert-roster",
  maxDuration: 300,
  run: async (payload: { roster: any, availability: any }) => {
    try {
      // Step 1: Generate roster using Gemini
      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      const prompt = `
        ${basePrompt}
        
        Current Roster Details:
        ${JSON.stringify(payload.roster, null, 2)}
        
        Available Staff Data:
        ${JSON.stringify(payload.availability, null, 2)}
      `;

      const result = await chatSession.sendMessage(prompt);
      const response = await result.response.text();

      // Clean and parse the Gemini response
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const shifts = JSON.parse(cleanResponse);

      // Step 2: Insert shifts into database
      const insertResult = await createShiftsFromJSON(shifts);

      return {
        success: true,
        generatedShifts: shifts,
        insertResult: insertResult
      };

    } catch (error) {
      console.error("Error in generate and insert roster task:", error);
      throw error;
    }
  },
});