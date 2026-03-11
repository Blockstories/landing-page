import { Article } from "../db/types.js";
import { BeehiivPost } from "../integrations/beehiiv.js";

/**
 * Map database row to Article object
 */
export function mapRowToArticle(row: {
  id: number;
  beehiiv_post_id: string;
  beehiiv_publication_id: string;
  title: string;
  subtitle: string | null;
  authors: string | null;
  publish_date: number;
  status: string;
  tags: string | null;
  thumbnail_url: string | null;
  web_url: string | null;
  summary: string | null;
  content: string | null;
}): Article {
  return {
    id: row.id,
    beehiivPostId: row.beehiiv_post_id,
    beehiivPublicationId: row.beehiiv_publication_id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    authors: row.authors ? JSON.parse(row.authors) : [],
    publishDate: row.publish_date,
    status: row.status as Article["status"],
    tags: row.tags ? JSON.parse(row.tags) : [],
    thumbnailUrl: row.thumbnail_url ?? undefined,
    webUrl: row.web_url ?? undefined,
    summary: row.summary ?? undefined,
    content: row.content ?? undefined,
  };
}

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
