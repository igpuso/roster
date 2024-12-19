import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
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

// Read the .md file and store its content
const promptFilePath = path.resolve(process.cwd(), "prompts/roster-generation.md");
const basePrompt = fs.readFileSync(promptFilePath, "utf-8");

export async function POST(request: Request) {
  try {
    const { roster, availability } = await request.json();
    
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Combine the base prompt with the dynamic data
    const prompt = `
${basePrompt}

Current Roster Details:
${JSON.stringify(roster, null, 2)}

Available Staff Data:
${JSON.stringify(availability, null, 2)}
`;

    const result = await chatSession.sendMessage(prompt);
    const response = await result.response.text();
    
    return NextResponse.json(JSON.parse(response));
  } catch (error) {
    console.error("Error generating roster:", error);
    return NextResponse.json({ error: "Failed to generate roster" }, { status: 500 });
  }
}
