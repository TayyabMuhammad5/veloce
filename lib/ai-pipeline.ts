
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import prisma from './prisma';

export async function processBriefAI(briefId: string, description: string) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn("No GROQ_API_KEY found. Skipping AI analysis.");
      return { success: false, error: "Missing API Key" };
    }

    // 1. Use standard text generation instead of strict object generation
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Analyze this project brief and extract the requirements. 
      You MUST return ONLY a valid JSON object. Do not include markdown formatting or backticks.
      
      Structure the JSON exactly like this:
      {
        "features": ["string", "string"],
        "category": "Web App", 
        "effortHours": 40,
        "techStack": ["string", "string"],
        "complexityScore": 3
      }
      
      Valid categories are: "Web App", "Mobile", "AI/ML", "Automation", "Integration".
      Complexity score must be a number between 1 and 5.

      Brief:
      ${description}`,
    });

    // 2. Strip any accidental markdown formatting the AI might have added
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 3. Parse it manually
    const object = JSON.parse(cleanJson);

    // 4. Save to database
    const analysis = await prisma.aIAnalysis.create({
      data: {
        briefId,
        features: object.features,
        category: object.category,
        effortHours: object.effortHours,
        techStack: object.techStack,
        complexityScore: object.complexityScore,
      }
    });

    return { success: true, analysis };
  } catch (error) {
    console.error("AI Pipeline failed:", error);
    return { success: false, error: "Failed to generate AI analysis" };
  }
}