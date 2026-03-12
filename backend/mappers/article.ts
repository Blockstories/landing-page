import { Article } from "../db/types.js";
import { BeehiivPost } from "../integrations/beehiiv.js";

/**
 * Result of mapping Beehiiv post to article input
 */
export interface ArticleInput {
  beehiivPostId: string;
  beehiivPublicationId: string;
  title: string;
  subtitle?: string;
  authorNames: string[];
  publishDate: number;
  status: Article["status"];
  tags: string[];
  thumbnailUrl?: string;
  webUrl?: string;
  summary?: string;
  content?: string;
}

/**
 * Map Beehiiv API post to Article input
 * Note: author names are returned separately - resolve to Person objects before storing
 */
export function mapBeehiivPostToArticle(
  post: BeehiivPost,
  publicationId: string
): ArticleInput {
  const content = post.free_web_content || post.content?.free?.web;

  return {
    beehiivPostId: post.id,
    beehiivPublicationId: publicationId,
    title: post.title,
    subtitle: post.subtitle || undefined,
    authorNames: post.authors || [],
    publishDate: post.publish_date || post.created,
    status: post.status,
    tags: post.content_tags || [],
    thumbnailUrl: post.thumbnail_url || undefined,
    webUrl: post.web_url || undefined,
    summary: undefined, // Generated separately via LLM
    content: content || undefined,
  };
}
