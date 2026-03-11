// /db/mappers/articleMapper.ts
import { Article } from "../types.js";

/**
 * Centralized mapper: DB row → Article object
 */
export function mapRowToArticle(row: any): Article {
  return {
    id: row.id,
    beehiivPostId: row.beehiiv_post_id,
    beehiivPublicationId: row.beehiiv_publication_id,
    title: row.title,
    subtitle: row.subtitle,
    authors: row.authors ? JSON.parse(row.authors) : [],
    publishDate: row.publish_date,
    status: row.status,
    tags: row.tags ? JSON.parse(row.tags) : [],
    thumbnailUrl: row.thumbnail_url,
    webUrl: row.web_url,
    summary: row.summary ?? undefined,
    content: row.content ?? undefined,
  };
}