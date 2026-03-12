import "dotenv/config";
import { getPostByPublicationIdAndPostId } from "../integrations/beehiiv.js";
import { createArticle, Article } from "../db/queries.js";
import { mapBeehiivPostToArticle } from "../mappers/article.js";
import { generateText } from "../integrations/openai.js";

/**
 * Process a Beehiiv post: fetch from API, store in DB, generate summary
 */
export async function processBeehiivPost(
  publicationId: string,
  postId: string
): Promise<Article> {
  // 1. Fetch post from Beehiiv with content
  const post = await getPostByPublicationIdAndPostId(publicationId, postId, ["free_web_content"]);

  // 2. Map to Article shape
  const articleInput = mapBeehiivPostToArticle(post, publicationId);

  // 3. Generate LLM summary if content exists
  if (articleInput.content) {
    articleInput.summary = await generateArticleSummary(articleInput.title, articleInput.content);
  }

  // 4. Store article in database
  const article = await createArticle(articleInput);

  return article;
}

/**
 * Generate a summary of the article using OpenAI
 */
async function generateArticleSummary(title: string, content: string): Promise<string> {
  const prompt = `Title: ${title}\n\nContent: ${content.substring(0, 4000)}\n\nProvide a concise 2-3 sentence summary:`;

  return generateText({
    model: "gpt-4o-mini",
    prompt,
    systemMessage: "You are a helpful assistant that summarizes articles concisely.",
    maxTokens: 150,
    temperature: 0.5
  });
}
