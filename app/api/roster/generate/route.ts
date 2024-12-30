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
            return NextResponse.json(
                { error: 'Missing required roster or availability data' }, 
                { status: 400 }
            );
        }

        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        const prompt = `${basePrompt}\n\nAvailability Data: ${JSON.stringify(body.availability, null, 2)}`;

        const result = await chatSession.sendMessage(prompt);
        const response = result.response;
        const text = response.text();
        
        // Clean the response to get only the JSON part
        const cleanResponse = text.replace(/```json\n|\n```/g, '').trim();

        try {
            const parsedResponse = JSON.parse(cleanResponse);
            
            // Get the base URL from the incoming request
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host');
            const baseUrl = `${protocol}://${host}`;
            
            // Format shifts data with rosterId
            const formattedShifts = parsedResponse.map((shift: any) => ({
                ...shift,
                rosterId: body.roster.id
            }));

            // Queue the shifts
            const queueResponse = await fetch(`${baseUrl}/api/trigger/queue-shifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roster: body.roster,
                    availability: body.availability,
                    generatedShifts: formattedShifts
                })
            });

            if (!queueResponse.ok) {
                throw new Error('Failed to queue shifts');
            }

            const queueResult = await queueResponse.json();
            return NextResponse.json({
                success: true,
                shifts: formattedShifts,
                jobId: queueResult.jobId
            });
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            return NextResponse.json(
                { error: "Invalid JSON response from AI" }, 
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error generating roster:", error);
        return NextResponse.json(
            { error: "Failed to generate roster" }, 
            { status: 500 }
        );
    }
}