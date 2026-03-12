import { Article } from "../db/types.js";
import { BeehiivPost } from "../integrations/beehiiv.js";

/**
 * Map Beehiiv API post to Article object
 */
export function mapBeehiivPostToArticle(
  post: BeehiivPost,
  publicationId: string
): Omit<Article, "id"> {
  const content = post.free_web_content || post.content?.free?.web;

  return {
    beehiivPostId: post.id,
    beehiivPublicationId: publicationId,
    title: post.title,
    subtitle: post.subtitle || undefined,
    authors: post.authors || [],
    publishDate: post.publish_date || post.created,
    status: post.status,
    tags: post.content_tags || [],
    thumbnailUrl: post.thumbnail_url || undefined,
    webUrl: post.web_url || undefined,
    summary: undefined, // Generated separately via LLM
    content: content || undefined,
  };
}
