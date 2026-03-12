import { db } from "./client.js";
import type { Article, Person, ArticleRole } from "./types.js";
import { mapRowToArticle, mapRowToPerson, combineArticleWithPeople } from "./mappers.js";

export type { Article, Person, ArticleRole };

/**
 * Fetch people for an article
 */
async function getPeopleForArticle(articleId: number): Promise<Array<{ person: Person; role: ArticleRole }>> {
  const result = await db.execute(
    `SELECT p.id, p.name, p.slug, p.image_url, p.company, ap.role
     FROM people p
     JOIN article_people ap ON p.id = ap.person_id
     WHERE ap.article_id = ?`,
    [articleId]
  );

  return result.rows.map((row) => ({
    person: mapRowToPerson(row),
    role: row.role as ArticleRole,
  }));
}

/**
 * Get newest articles with their people
 */
export async function getNewestArticles(count: number = 10): Promise<Article[]> {
  const result = await db.execute(
    "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ?",
    [count]
  );

  const articles = result.rows.map(mapRowToArticle);

  // Fetch people for each article
  const articlesWithPeople = await Promise.all(
    articles.map(async (article) => {
      const people = await getPeopleForArticle(article.id);
      return combineArticleWithPeople(article, people);
    })
  );

  return articlesWithPeople;
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
  if (!row) return null;

  const article = mapRowToArticle(row);
  const people = await getPeopleForArticle(article.id);
  return combineArticleWithPeople(article, people);
}

/**
 * Get single article by ID
 */
export async function getArticleById(id: number): Promise<Article | null> {
  const result = await db.execute(
    "SELECT * FROM articles WHERE id = ?",
    [id]
  );

  const row = result.rows[0];
  if (!row) return null;

  const article = mapRowToArticle(row);
  const people = await getPeopleForArticle(article.id);
  return combineArticleWithPeople(article, people);
}

/**
 * Create a new article with people relations
 */
export async function createArticle(
  article: Omit<Article, "id">,
  people: Array<{ personId: number; role: ArticleRole }> = []
): Promise<Article> {
  // Insert article
  await db.execute(
    `INSERT INTO articles
      (beehiiv_post_id, beehiiv_publication_id, title, subtitle, publish_date, status, tags, thumbnail_url, web_url, summary, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      article.beehiivPostId,
      article.beehiivPublicationId,
      article.title,
      article.subtitle ?? null,
      article.publishDate,
      article.status,
      JSON.stringify(article.tags),
      article.thumbnailUrl ?? null,
      article.webUrl ?? null,
      article.summary || null,
      article.content || null,
    ]
  );

  // Get the newly created article
  const saved = await getArticleByPublicationIdAndPostId(article.beehiivPublicationId, article.beehiivPostId);
  if (!saved) throw new Error("Failed to retrieve newly inserted article");

  // Insert people relations
  if (people.length > 0) {
    for (const { personId, role } of people) {
      await db.execute(
        "INSERT INTO article_people (article_id, person_id, role) VALUES (?, ?, ?)",
        [saved.id, personId, role]
      );
    }
  }

  // Return article with people
  return getArticleById(saved.id) as Promise<Article>;
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
 * Update article summary
 */
export async function updateArticleSummary(
  articleId: number,
  summary: string
): Promise<void> {
  await db.execute(
    "UPDATE articles SET summary = ? WHERE id = ?",
    [summary, articleId]
  );
}

/**
 * Add person to article
 */
export async function addPersonToArticle(
  articleId: number,
  personId: number,
  role: ArticleRole
): Promise<void> {
  await db.execute(
    "INSERT OR IGNORE INTO article_people (article_id, person_id, role) VALUES (?, ?, ?)",
    [articleId, personId, role]
  );
}

/**
 * Remove person from article
 */
export async function removePersonFromArticle(
  articleId: number,
  personId: number,
  role: ArticleRole
): Promise<void> {
  await db.execute(
    "DELETE FROM article_people WHERE article_id = ? AND person_id = ? AND role = ?",
    [articleId, personId, role]
  );
}

/**
 * Get articles by person (as author or featured)
 */
export async function getArticlesByPerson(
  personId: number,
  role?: ArticleRole
): Promise<Article[]> {
  let query = `SELECT a.* FROM articles a
               JOIN article_people ap ON a.id = ap.article_id
               WHERE ap.person_id = ?`;
  const params: (number | string)[] = [personId];

  if (role) {
    query += " AND ap.role = ?";
    params.push(role);
  }

  query += " ORDER BY a.publish_date DESC";

  const result = await db.execute(query, params);
  const articles = result.rows.map(mapRowToArticle);

  // Fetch people for each article
  const articlesWithPeople = await Promise.all(
    articles.map(async (article) => {
      const people = await getPeopleForArticle(article.id);
      return combineArticleWithPeople(article, people);
    })
  );

  return articlesWithPeople;
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

/**
 * Create a new person
 */
export async function createPerson(
  person: Omit<Person, "id">
): Promise<Person> {
  await db.execute(
    "INSERT INTO people (name, slug, image_url, company) VALUES (?, ?, ?, ?)",
    [person.name, person.slug, person.imageUrl ?? null, person.company ?? null]
  );

  const result = await db.execute(
    "SELECT * FROM people WHERE slug = ?",
    [person.slug]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to retrieve newly inserted person");
  return mapRowToPerson(row);
}

/**
 * Find or create person by name
 */
export async function findOrCreatePerson(
  name: string,
  slug?: string,
  imageUrl?: string
): Promise<Person> {
  const existing = await getPersonByName(name);
  if (existing) return existing;

  // Generate slug from name if not provided
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return createPerson({ name, slug: finalSlug, imageUrl });
}

export interface Cursor {
  ts: number;
  id: number;
}

export interface ArticlesByPublicationResult {
  articles: Article[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Get articles by publication with cursor-based pagination
 */
export async function getArticlesByPublication(
  publicationId: string,
  limit: number,
  cursor?: Cursor
): Promise<ArticlesByPublicationResult> {
  // Build query with optional cursor filter
  let query = `SELECT * FROM articles WHERE beehiiv_publication_id = ?`;
  const params: (string | number)[] = [publicationId];

  if (cursor) {
    query += ` AND (publish_date < ? OR (publish_date = ? AND id < ?))`;
    params.push(cursor.ts, cursor.ts, cursor.id);
  }

  // Order by publish_date DESC, then id DESC for stable pagination
  // Fetch one extra to determine if there are more results
  query += ` ORDER BY publish_date DESC, id DESC LIMIT ?`;
  params.push(limit + 1);

  const result = await db.execute(query, params);
  const rows = result.rows;

  // Check if there are more results
  const hasMore = rows.length > limit;

  // Remove the extra row if we fetched one
  const articleRows = hasMore ? rows.slice(0, limit) : rows;

  // Map rows to articles
  const articles = articleRows.map(mapRowToArticle);

  // Fetch people for each article
  const articlesWithPeople = await Promise.all(
    articles.map(async (article) => {
      const people = await getPeopleForArticle(article.id);
      return combineArticleWithPeople(article, people);
    })
  );

  // Generate next cursor if there are more results
  let nextCursor: string | undefined;
  if (hasMore && articlesWithPeople.length > 0) {
    const lastArticle = articlesWithPeople[articlesWithPeople.length - 1];
    const cursorData: Cursor = {
      ts: lastArticle.publishDate,
      id: lastArticle.id
    };
    nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
  }

  return {
    articles: articlesWithPeople,
    hasMore,
    nextCursor
  };
}
