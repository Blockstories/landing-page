import "dotenv/config";
import { generateCompletion, generateText } from "../integrations/openai.js";

async function testOpenAIIntegration() {
  console.log("Testing OpenAI Integration...\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not set in environment");
    process.exit(1);
  }

  try {
    // Test 1: Simple completion with gpt-4o-mini
    console.log("Test 1: Simple completion with gpt-4o-mini");
    console.log("-------------------------------------------");

    const response1 = await generateCompletion({
      model: "gpt-4o-mini",
      prompt: "What are 3 benefits of blockchain technology?"
    });

    console.log("Model:", response1.model);
    console.log("Usage:", response1.usage);
    console.log("Response:", response1.choices[0]?.message?.content);

    // Test 2: With system message using generateText convenience function
    console.log("\n\nTest 2: With system message (using generateText)");
    console.log("--------------------------------------------------");

    const text = await generateText({
      model: "gpt-4o-mini",
      prompt: "Explain DeFi in one sentence.",
      systemMessage: "You are a blockchain expert. Be concise.",
      temperature: 0.7,
      maxTokens: 100
    });

    console.log("Response:", text);

    console.log("\n✅ All tests completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testOpenAIIntegration();
