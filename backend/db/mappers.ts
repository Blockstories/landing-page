import type { Row } from "@libsql/client";
import type { Article, Person } from "./types.js";

/**
 * Map database row to Article object
 */
export function mapRowToArticle(row: Row): Article {
  return {
    id: row.id as number,
    beehiivPostId: row.beehiiv_post_id as string,
    beehiivPublicationId: row.beehiiv_publication_id as string,
    title: row.title as string,
    subtitle: row.subtitle as string | undefined ?? undefined,
    authors: row.authors ? JSON.parse(row.authors as string) : [],
    publishDate: row.publish_date as number,
    status: row.status as Article["status"],
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    thumbnailUrl: row.thumbnail_url as string | undefined ?? undefined,
    webUrl: row.web_url as string | undefined ?? undefined,
    summary: row.summary as string | undefined ?? undefined,
    content: row.content as string | undefined ?? undefined,
  };
}

/**
 * Map database row to Person object
 */
export function mapRowToPerson(row: Row): Person {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    imageUrl: row.image_url as string | undefined ?? undefined,
  };
}
