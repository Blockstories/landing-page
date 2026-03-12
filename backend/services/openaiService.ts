import "../loadEnv.js";
import { generateText } from "../integrations/openai.js";
import { loadPrompt, fillPrompt } from "../utils/promptLoader.js";

/**
 * Generate a summary of a news article using the article-summary prompt.
 */
export async function summarizeArticle(articleText: string): Promise<string> {
  const prompt = loadPrompt("article-summary");
  const filledPrompt = fillPrompt(prompt.template, { article: articleText });

  const summary = await generateText({
    model: prompt.model,
    prompt: filledPrompt,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
  });

  return summary;
}

// Test function for development
async function testSummarizeArticle() {
  console.log("Testing Article Summarization...\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not set in environment");
    process.exit(1);
  }

  const sampleArticle = `
Bitcoin surged to a new all-time high of $73,000 on Tuesday, driven by record
inflows into spot Bitcoin ETFs. BlackRock's IBIT alone saw over $800 million
in daily inflows, bringing its total assets under management to over $15 billion.
Analysts attribute the rally to institutional adoption and anticipation of the
upcoming Bitcoin halving event scheduled for April.
  `.trim();

  try {
    console.log("Input article:");
    console.log("-".repeat(50));
    console.log(sampleArticle);
    console.log("-".repeat(50));
    console.log("\nGenerating summary...\n");

    const summary = await summarizeArticle(sampleArticle);

    console.log("Summary:");
    console.log(summary);
    console.log("\n✅ Test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSummarizeArticle();
}
