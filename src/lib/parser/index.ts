import { z } from "zod";

/**
 * Schema for structured monitoring results from AI platforms.
 */
export const MonitoringResultSchema = z.object({
  brands: z.array(
    z.object({
      name: z.string().describe("Name of the brand mentioned."),
      rank: z.number().nullable().optional().describe("Numerical rank if brand is in a recommendation list."),
      sentiment: z.enum(["positive", "neutral", "negative"]).describe("Sentiment of the mention."),
    })
  ),
  citations: z.array(
    z.object({
      url: z.string().describe("URL of the citation source."),
      domain: z.string().describe("Domain name of the source."),
      title: z.string().nullable().optional().describe("Title of the cited page."),
    })
  ),
});

export type MonitoringResult = z.infer<typeof MonitoringResultSchema>;

/**
 * Structured response for the database, combining parsing result and metadata.
 */
export interface MonitoringParsedOutput extends MonitoringResult {
  countryCode: string;
}

/**
 * Parses raw text from an AI response into structured JSON format using OpenAI's Structured Outputs.
 *
 * @param raw - The raw text response from an AI platform.
 * @param countryCode - The geographic context of the monitoring (e.g., "US", "CN").
 * @returns A structured object containing brands, citations, and metadata.
 */
export async function parseAIResponse(raw: string, countryCode: string): Promise<MonitoringParsedOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const systemPrompt = `You are a specialized data extraction service for Global Experience Optimization (GEO) monitoring.
Analyze the provided AI response text and extract:
1. Brands: Mentioned brand names, their rank in any recommendation/list (if applicable), and sentiment (positive, neutral, negative).
2. Citations: Any URLs mentioned, their domain names, and page titles if available.

Guidelines:
- If a brand is listed first in a recommendation, rank is 1. If not in a list, rank is null.
- Sentiment should be judged based on the context of the mention.
- Support both English and Chinese text extraction accurately.
- Handle localized brand names (e.g., "苹果" as "Apple").
- For Citations, extract domain from the URL if not explicitly mentioned.

Return ONLY structured JSON matching the provided schema.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Raw response to parse:\n\n${raw}` },
        ],
        temperature: 0, // Deterministic parsing
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "monitoring_result",
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
                      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                    },
                    required: ["name", "rank", "sentiment"],
                    additionalProperties: false,
                  },
                },
                citations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      domain: { type: "string" },
                      title: { type: ["string", "null"] },
                    },
                    required: ["url", "domain", "title"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["brands", "citations"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const contentText = data.choices[0]?.message?.content;

    if (!contentText) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = MonitoringResultSchema.parse(JSON.parse(contentText));

    return {
      ...parsed,
      countryCode,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod Validation Error:", error.errors);
      throw new Error(`Parsing failed: Schema mismatch for ${countryCode}`);
    }
    console.error("LLM Parsing Service Error:", error);
    throw error;
  }
}
