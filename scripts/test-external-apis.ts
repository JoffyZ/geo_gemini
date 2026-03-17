import * as dotenv from "dotenv";
dotenv.config();

async function testPerplexity() {
  console.log("\n--- Testing Perplexity API (Sonar Model) ---");
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log("Perplexity API Key missing ❌");
    return;
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Be precise and include citations." },
          { role: "user", content: "What are the top 3 best selling SUV brands in China in 2024?" }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    console.log("Response Content:", data.choices[0].message.content.substring(0, 200) + "...");
    console.log("Citations Found:", data.citations?.length || 0);
    if (data.citations?.length > 0) {
      console.log("Sample Citation:", data.citations[0]);
    }
    console.log("Perplexity Test: SUCCESS ✅");
  } catch (error: any) {
    console.error("Perplexity Test: FAILED ❌");
    console.error("Error:", error.message);
  }
}

async function testSerpApi() {
  console.log("\n--- Testing SerpApi (Google Search & GAIO) ---");
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.log("SerpApi Key missing ❌");
    return;
  }

  const query = "best electric cars 2024";
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);

    console.log("Search Result Title:", data.organic_results?.[0]?.title);
    const hasAIOverview = !!data.answer_box || !!data.google_optimised_search_results;
    console.log("AI Features Found (Answer Box/GAIO):", hasAIOverview ? "YES ✅" : "NO (Standard SERP) ℹ️");
    console.log("SerpApi Test: SUCCESS ✅");
  } catch (error: any) {
    console.error("SerpApi Test: FAILED ❌");
    console.error("Error:", error.message);
  }
}

async function runTests() {
  await testPerplexity();
  await testSerpApi();
  process.exit(0);
}

runTests();
