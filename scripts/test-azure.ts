import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";
dotenv.config();

async function testAzureOpenAI() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

  console.log(`Connecting to Azure Endpoint: ${endpoint}`);
  console.log(`Using Deployment: ${deployment}`);

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    deployment,
  });

  console.log("\n[Test 1] Simple Chat Completion...");
  try {
    const startTime = Date.now();
    const result = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, who are you?" }
      ],
      model: "", // In Azure SDK with deployment, this is typically left empty or matches deployment
    });
    const duration = Date.now() - startTime;
    console.log("Response:", result.choices[0].message.content);
    console.log(`Latency: ${duration}ms`);
    console.log("Basic Connectivity: SUCCESS ✅");
  } catch (error: any) {
    console.error("Basic Connectivity: FAILED ❌");
    console.error("Error:", error.message);
  }

  console.log("\n[Test 2] Web Search Capability (if configured)...");
  try {
    // Note: Azure Web Search requires specific 'data_sources' in the request
    const result = await (client.chat.completions as any).create({
      messages: [
        { role: "user", content: "What is the current stock price of Apple?" }
      ],
      model: "",
      data_sources: [
        {
          type: "web_search",
          parameters: {
            endpoint: "https://api.bing.microsoft.com/v7.0/search", // Default Bing endpoint
            key: "placeholder", // Azure handles this if pre-configured in Foundry
          }
        }
      ]
    });
    
    const hasSearch = result.choices[0].message?.context?.citations;
    console.log("Web Search Metadata Found:", hasSearch ? "YES ✅" : "NO (Only fallback used) ℹ️");
    if (hasSearch) {
      console.log("Sample Citation:", result.choices[0].message.context.citations[0].url);
    }
  } catch (error: any) {
    console.log("Web Search Tool: NOT ACTIVE or MISCONFIGURED ℹ️");
    console.log("Message:", error.message);
  }

  process.exit(0);
}

testAzureOpenAI();
