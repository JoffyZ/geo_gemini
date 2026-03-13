import { GeoAdapter } from "../interface";

/**
 * Google AI Overviews (GAIO) implementation of the GeoAdapter.
 * Simulates real-world Google search behavior by using SerpApi's geographical simulation ('gl' parameter).
 * Extracts AI-generated overviews (AIO) from the search result.
 */
export class GAIOAdapter implements GeoAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async query(prompt: string, countryCode: string): Promise<{ rawResponse: string }> {
    if (!this.apiKey) {
      throw new Error("SerpApi Key is not configured for GAIO adapter.");
    }

    // Prepare SerpApi parameters
    // 'gl' (Geographic Location) is the country to search from
    // 'q' (Query) is the user's prompt
    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: "google",
      q: prompt,
      gl: countryCode.toLowerCase(),
      google_domain: "google.com",
      hl: "en", // Default to English for AI Overviews
    });

    try {
      const response = await fetch(`https://serpapi.com/search?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SerpApi Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // Extract content from AI Overview or Answer Box
      // Note: SerpApi results may vary depending on whether GAIO is triggered for the specific query.
      const aiOverview = data.ai_overview;
      let rawResponse = "";

      if (aiOverview) {
        // AI Overview content can be a single string or an array of components
        if (typeof aiOverview === "string") {
          rawResponse = aiOverview;
        } else if (Array.isArray(aiOverview.components)) {
          rawResponse = aiOverview.components.map((c: any) => c.text || "").join("\n");
        } else if (aiOverview.text) {
          rawResponse = aiOverview.text;
        }
      }

      // Fallback to knowledge_graph or answer_box if AI Overview is not present
      if (!rawResponse) {
        rawResponse =
          data.answer_box?.answer ||
          data.answer_box?.snippet ||
          data.knowledge_graph?.description ||
          "Google AI Overview not triggered for this query. Traditional search results returned.";
      }

      return { rawResponse };
    } catch (error) {
      console.error("GAIO Adapter Error:", error);
      throw error;
    }
  }
}
