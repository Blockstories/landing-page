import "dotenv/config";
import { getPostByPublicationIdAndPostId, BeehiivPost } from "../integrations/beehiiv.js";
import { createArticle, Article } from "../db/queries.js";
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

  // 2. Generate LLM summary if content exists
  const content = post.free_web_content || post.content?.free?.web;
  let summary: string | undefined;
  if (content) {
    summary = await generateArticleSummary(post.title, content);
  }

  // 3. Store article in database
  const article = await createArticle({
    beehiivPostId: post.id,
    beehiivPublicationId: publicationId,
    title: post.title,
    subtitle: post.subtitle,
    authors: post.authors,
    publishDate: post.publish_date || post.created,
    status: post.status,
    tags: post.content_tags || [],
    thumbnailUrl: post.thumbnail_url,
    webUrl: post.web_url,
    summary,
    content: post.free_web_content || post.content?.free?.web
  });

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
