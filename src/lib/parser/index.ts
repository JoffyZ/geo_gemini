import { z } from "zod";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Schema for structured monitoring results from AI platforms.
 */
export const MonitoringResultSchema = z.object({
  brands: z.array(
    z.object({
      name: z.string().describe("Name of the brand or product mentioned"),
      rank: z.number().nullable().describe("Numerical rank or order if provided (1-based)"),
      sentiment: z.enum(["positive", "neutral", "negative"]).describe("Sentiment of the mention"),
    })
  ).describe("List of brands found in the response"),
  citations: z.array(
    z.object({
      url: z.string().describe("Full URL of the citation"),
      domain: z.string().describe("Clean domain name of the citation"),
      title: z.string().optional().describe("Title of the cited page if available"),
    })
  ).describe("List of source citations/links found in the response"),
  answerSummary: z.string().optional().default("").describe("A brief 1-2 sentence summary of the AI's answer"),
});

export type MonitoringResult = z.infer<typeof MonitoringResultSchema>;

/**
 * Parses raw AI response into structured data using LLM.
 * Fallbacks to Gemini if OpenAI is not configured.
 */
export async function parseAIResponse(
  rawResponse: string,
  countryCode: string
): Promise<MonitoringResult & { countryCode: string }> {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAiKey && !geminiKey) {
    throw new Error("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured for parsing.");
  }

  const systemPrompt = `You are a specialized data extraction service for Global Experience Optimization (GEO) monitoring.
    Your task is to extract brand mentions, their rankings, sentiments, and citations from an AI's search response.
    
    Target Country Context: ${countryCode}
    
    Guidelines:
    1. Extract all brands/products mentioned as recommendations or search results.
    2. Assign a rank (1, 2, 3...) if the AI lists them in order. Otherwise, use null.
    3. Determine sentiment (positive/neutral/negative) based on the AI's tone regarding that brand.
    4. Extract all URLs/Links provided as sources.
    5. Provide a concise summary of the overall answer in "answerSummary" field.
    6. Return the data in strict JSON format.`;

  // --- Option 1: Use OpenAI if available ---
  if (openAiKey) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Raw AI Response to parse:\n\n${rawResponse}` },
        ],
        response_format: { type: "json_schema", json_schema: {
          name: "monitoring_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              brands: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    rank: { type: ["number", "null"] },
                    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] }
                  },
                  required: ["name", "rank", "sentiment"],
                  additionalProperties: false
                }
              },
              citations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    domain: { type: "string" },
                    title: { type: "string" }
                  },
                  required: ["url", "domain", "title"],
                  additionalProperties: false
                }
              },
              answerSummary: { type: "string" }
            },
            required: ["brands", "citations", "answerSummary"],
            additionalProperties: false
          }
        }},
      });

      const parsed = completion.choices[0].message.parsed;
      if (!parsed) throw new Error("OpenAI parsing returned null");

      return { ...parsed, countryCode };
    } catch (error) {
      if (!geminiKey) throw error;
      console.warn("OpenAI parsing failed or not configured, falling back to Gemini...");
    }
  }

  // --- Option 2: Fallback to Gemini 2.5 Flash ---
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `${systemPrompt}
      
      Required JSON Structure:
      {
        "brands": [{"name": "string", "rank": number | null, "sentiment": "positive" | "neutral" | "negative"}],
        "citations": [{"url": "string", "domain": "string", "title": "string"}],
        "answerSummary": "string"
      }

      Raw AI Response to parse:
      ${rawResponse}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Basic JSON extraction
      const jsonStr = text.includes("```") ? text.match(/\{[\s\S]*\}/)?.[0] || text : text;
      const rawJson = JSON.parse(jsonStr);
      
      // Ensure answerSummary exists even if AI missed it
      if (!rawJson.answerSummary) rawJson.answerSummary = "";
      
      const parsed = MonitoringResultSchema.parse(rawJson);

      return { ...parsed, countryCode };
    } catch (error) {
      console.error("Gemini parsing failed:", error);
      throw error;
    }
  }

  throw new Error("Parsing failed: No available AI engine responded.");
}
