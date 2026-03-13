import { db } from "./client.js";
import type { Article, Person, ArticleRole } from "./types.js";
import { mapRowToArticle, mapRowToPerson, combineArticleWithPeople } from "./mappers.js";

export type { Article, Person, ArticleRole };

// ============================================================================
// Simple in-memory cache to reduce DB hits and cold start penalties
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (essentially infinite for this use case)

function getCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(":")}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  console.log(`[Cache] Hit for ${key} (${Math.round(age / 1000)}s old)`);
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[Cache] Set ${key}`);
}

/**
 * Clear all cache entries or those matching a prefix
 * Call this from webhooks when new content is published
 * @param prefix - Optional prefix to clear specific cache entries (e.g., "pub:" for publication queries)
 */
export function clearCache(prefix?: string): void {
  if (prefix) {
    let cleared = 0;
    const keys = Array.from(cache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
        cleared++;
      }
    }
    console.log(`[Cache] Cleared ${cleared} entries with prefix "${prefix}"`);
  } else {
    const size = cache.size;
    cache.clear();
    console.log(`[Cache] Cleared all ${size} entries`);
  }
}

// Clear old entries periodically (mostly for memory safety, rarely triggers with 30-day TTL)
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    const entry = cache.get(key);
    if (entry && now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`[Cache] Cleared ${cleared} expired entries`);
  }
}, 60 * 60 * 1000); // Check every hour

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
 * Uses a single JOIN query to avoid N+1 problem
 * Results are cached for 60 seconds (first page only)
 * @param count - Number of articles to fetch (default: 10)
 * @param offset - Number of articles to skip for pagination (default: 0)
 */
export async function getNewestArticles(count: number = 10, offset: number = 0): Promise<Article[]> {
  // Only cache first page (offset === 0)
  const cacheKey = offset === 0 ? getCacheKey("newest", count) : null;

  if (cacheKey) {
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;
  }

  // Single query to get articles with all their people via JOIN
  const result = await db.execute(
    `SELECT
       a.*,
       p.id as person_id, p.name, p.slug, p.image_url, p.company,
       ap.role
     FROM articles a
     LEFT JOIN article_people ap ON a.id = ap.article_id
     LEFT JOIN people p ON ap.person_id = p.id
     ORDER BY a.publish_date DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [count, offset]
  );

  // Group rows by article and collect people
  const articleMap = new Map<number, { article: Omit<Article, "authors" | "featured">; people: Array<{ person: Person; role: ArticleRole }> }>();

  for (const row of result.rows) {
    const articleId = row.id as number;

    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle(row),
        people: []
      });
    }

    // If there's a person (LEFT JOIN may return nulls)
    if (row.person_id) {
      const entry = articleMap.get(articleId)!;
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role as ArticleRole
      });
    }
  }

  // Convert map to array of complete articles
  const articles = Array.from(articleMap.values()).map(({ article, people }) =>
    combineArticleWithPeople(article, people)
  );

  if (cacheKey) {
    setCached(cacheKey, articles);
  }

  return articles;
}

/**
 * Get articles by tags with their people
 * Uses a single JOIN query to avoid N+1 problem
 * Only returns confirmed articles
 * Results are cached for performance
 * @param count - Number of articles to fetch (default: 10)
 * @param tags - Optional array of tags to filter by (OR logic: articles matching ANY tag are returned)
 */
export async function getArticlesByTags(
  count: number = 10,
  tags?: string[]
): Promise<Article[]> {
  // Build cache key that includes tags for differentiation
  const cacheKey = getCacheKey("tags", count, tags?.length ? JSON.stringify([...tags].sort()) : "all");

  const cached = getCached<Article[]>(cacheKey);
  if (cached) return cached;

  // Build query with optional tag filtering
  let query = `SELECT
    a.*,
    p.id as person_id, p.name, p.slug, p.image_url, p.company,
    ap.role
  FROM articles a
  LEFT JOIN article_people ap ON a.id = ap.article_id
  LEFT JOIN people p ON ap.person_id = p.id
  WHERE a.status = 'confirmed'`;
  const params: (string | number)[] = [];

  // Add tag filtering if tags are provided (OR logic - match ANY tag)
  if (tags && tags.length > 0) {
    const tagConditions = tags.map(() => `json_extract(a.tags, '$') LIKE ?`).join(" OR ");
    query += ` AND (${tagConditions})`;
    // Each tag is wrapped in quotes for JSON array matching
    tags.forEach((tag) => params.push(`%"${tag}"%`));
  }

  query += ` ORDER BY a.publish_date DESC, a.id DESC LIMIT ?`;
  params.push(count);

  const result = await db.execute(query, params);

  // Group rows by article and collect people
  const articleMap = new Map<number, { article: Omit<Article, "authors" | "featured">; people: Array<{ person: Person; role: ArticleRole }> }>();

  for (const row of result.rows) {
    const articleId = row.id as number;

    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle(row),
        people: []
      });
    }

    // If there's a person (LEFT JOIN may return nulls)
    if (row.person_id) {
      const entry = articleMap.get(articleId)!;
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role as ArticleRole
      });
    }
  }

  // Convert map to array of complete articles
  const articles = Array.from(articleMap.values()).map(({ article, people }) =>
    combineArticleWithPeople(article, people)
  );

  setCached(cacheKey, articles);

  return articles;
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
 * Uses a single JOIN query to avoid N+1 problem
 * Results are cached for 60 seconds to reduce DB hits
 */
export async function getArticlesByPublication(
  publicationId: string,
  limit: number,
  cursor?: Cursor
): Promise<ArticlesByPublicationResult> {
  // Skip cache for cursor-based pagination (infinite scroll)
  const cacheKey = cursor
    ? null
    : getCacheKey("pub", publicationId, limit);

  if (cacheKey) {
    const cached = getCached<ArticlesByPublicationResult>(cacheKey);
    if (cached) return cached;
  }

  // Build query with optional cursor filter and JOIN for people
  let query = `SELECT
    a.*,
    p.id as person_id, p.name, p.slug, p.image_url, p.company,
    ap.role
  FROM articles a
  LEFT JOIN article_people ap ON a.id = ap.article_id
  LEFT JOIN people p ON ap.person_id = p.id
  WHERE a.beehiiv_publication_id = ?`;
  const params: (string | number)[] = [publicationId];

  if (cursor) {
    query += ` AND (a.publish_date < ? OR (a.publish_date = ? AND a.id < ?))`;
    params.push(cursor.ts, cursor.ts, cursor.id);
  }

  // Order by publish_date DESC, then id DESC for stable pagination
  // Fetch one extra to determine if there are more results
  query += ` ORDER BY a.publish_date DESC, a.id DESC LIMIT ?`;
  params.push(limit + 1);

  const result = await db.execute(query, params);
  const rows = result.rows;

  // Check if there are more results
  const hasMore = rows.length > limit;

  // Group rows by article and collect people
  const articleMap = new Map<number, { article: Omit<Article, "authors" | "featured">; people: Array<{ person: Person; role: ArticleRole }> }>();

  for (const row of rows) {
    const articleId = row.id as number;

    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle(row),
        people: []
      });
    }

    // If there's a person (LEFT JOIN may return nulls)
    if (row.person_id) {
      const entry = articleMap.get(articleId)!;
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role as ArticleRole
      });
    }
  }

  // Remove the extra row if we fetched one
  const articleEntries = Array.from(articleMap.values());
  const limitedEntries = hasMore ? articleEntries.slice(0, limit) : articleEntries;

  // Convert to final articles
  const articlesWithPeople = limitedEntries.map(({ article, people }) =>
    combineArticleWithPeople(article, people)
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

  const returnResult: ArticlesByPublicationResult = {
    articles: articlesWithPeople,
    hasMore,
    nextCursor
  };

  if (cacheKey) {
    setCached(cacheKey, returnResult);
  }

  return returnResult;
}
