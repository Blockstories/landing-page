import type { Row } from "@libsql/client";
import type { Article, Person, ArticleRole } from "./types.js";

// Flexible row type that accepts both full Row objects and partial row data
export type RowLike = Row | Record<string, unknown>;

/**
 * Map database row to Article object (without people - attach separately)
 */
export function mapRowToArticle(row: RowLike): Omit<Article, "authors" | "featured"> {
  return {
    id: row.id as number,
    beehiivPostId: row.beehiiv_post_id as string,
    beehiivPublicationId: row.beehiiv_publication_id as string,
    title: row.title as string,
    subtitle: row.subtitle as string | undefined ?? undefined,
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
export function mapRowToPerson(row: RowLike): Person {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    imageUrl: row.image_url as string | undefined ?? undefined,
    company: (row.company as string | null) ?? null,
  };
}

/**
 * Combine article data with authors and featured people
 */
export function combineArticleWithPeople(
  article: Omit<Article, "authors" | "featured">,
  people: Array<{ person: Person; role: ArticleRole }>
): Article {
  return {
    ...article,
    authors: people.filter((p) => p.role === "author").map((p) => p.person),
    featured: people.filter((p) => p.role === "featured").map((p) => p.person),
  };
}
