import { db } from "./client.js";
import type { Article, Person } from "./types.js";
import { mapRowToArticle, mapRowToPerson } from "./mappers.js";

export type { Article, Person };

/**
 * Get newest articles
 */
export async function getNewestArticles(count: number = 10): Promise<Article[]> {
  const result = await db.execute(
    "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ?",
    [count]
  );

  return result.rows.map(mapRowToArticle);
}

/**
 * Get single article by publication + post ID
 */
export async function getArticleByPublicationIdAndPostId(
  publicationId: string,
  postId: string
): Promise<Article | null> {
  const result = await db.execute(
    "SELECT * FROM articles WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?",
    [publicationId, postId]
  );

  const row = result.rows[0];
  return row ? mapRowToArticle(row) : null;
}

/**
 * Create a new article
 */
export async function createArticle(article: Omit<Article, "id">): Promise<Article> {
  await db.execute(
    `INSERT INTO articles
      (beehiiv_post_id, beehiiv_publication_id, title, subtitle, authors, publish_date, status, tags, thumbnail_url, web_url, summary, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      article.beehiivPostId,
      article.beehiivPublicationId,
      article.title,
      article.subtitle ?? null,
      JSON.stringify(article.authors),
      article.publishDate,
      article.status,
      JSON.stringify(article.tags),
      article.thumbnailUrl ?? null,
      article.webUrl ?? null,
      article.summary || null,
      article.content || null,
    ]
  );

  // Return the newly created article
  const saved = await getArticleByPublicationIdAndPostId(article.beehiivPublicationId, article.beehiivPostId);
  if (!saved) throw new Error("Failed to retrieve newly inserted article");
  return saved;
}

/**
 * Update article status
 */
export async function updateArticleStatus(
  publicationId: string,
  postId: string,
  status: Article["status"]
): Promise<void> {
  await db.execute(
    "UPDATE articles SET status = ? WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?",
    [status, publicationId, postId]
  );
}

/**
 * Update article content
 */
export async function updateArticleContent(
  publicationId: string,
  postId: string,
  content: string
): Promise<void> {
  await db.execute(
    "UPDATE articles SET content = ? WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?",
    [content, publicationId, postId]
  );
}

/**
 * Get person by slug
 */
export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const result = await db.execute(
    "SELECT * FROM people WHERE slug = ?",
    [slug]
  );

  const row = result.rows[0];
  return row ? mapRowToPerson(row) : null;
}

/**
 * Get person by name
 */
export async function getPersonByName(name: string): Promise<Person | null> {
  const result = await db.execute(
    "SELECT * FROM people WHERE name = ?",
    [name]
  );

  const row = result.rows[0];
  return row ? mapRowToPerson(row) : null;
}