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
const promptFilePath = path.resolve(process.cwd(), "prompts/Roster_Generation_Prompt.md");
console.log('Prompt file path:', promptFilePath);
console.log('File exists:', fs.existsSync(promptFilePath));
const basePrompt = fs.readFileSync(promptFilePath, "utf-8");

export async function POST(request: Request) {
    try {
        console.log('Generate roster endpoint hit');
        
        const body = await request.json();
        console.log('Received data:', body);

        if (!body.roster || !body.availability) {
            console.error('Missing required data');
            return NextResponse.json(
                { error: 'Missing required roster or availability data' }, 
                { status: 400 }
            );
        }

        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        // Combine the base prompt with the dynamic data
        const prompt = `
        ${basePrompt}
        
        Current Roster Details:
        ${JSON.stringify(body.roster, null, 2)}
        
        Available Staff Data:
        ${JSON.stringify(body.availability, null, 2)}
        `;
        
        console.log('Sending prompt to Gemini');
        const result = await chatSession.sendMessage(prompt);
        const response = await result.response.text();
        
        console.log('Raw response from Gemini:', response);

        // Clean up the response by removing markdown formatting
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        console.log('Cleaned response:', cleanResponse);

        try {
            const parsedResponse = JSON.parse(cleanResponse);
            return NextResponse.json(parsedResponse);
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            return NextResponse.json(
                { error: "Invalid JSON response from AI", details: cleanResponse }, 
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        console.error("Detailed generate roster error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to generate roster", details: errorMessage }, 
            { status: 500 }
        );
    }
}