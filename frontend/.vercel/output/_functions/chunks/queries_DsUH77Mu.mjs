import { createClient } from '@libsql/client/web';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

let loaded = false;
function loadEnv() {
  if (loaded) return;
  const currentFile = fileURLToPath(import.meta.url);
  const backendDir = resolve(currentFile, "../..");
  const rootDir = resolve(backendDir, "..");
  const envPaths = [
    resolve(rootDir, ".env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env")
  ];
  for (const envPath of envPaths) {
    try {
      config({ path: envPath });
      if (process.env.TURSO_DB_URL) {
        loaded = true;
        console.log(`[env] Loaded from ${envPath}`);
        return;
      }
    } catch {
    }
  }
  console.warn("[env] Warning: Could not load .env file with required variables");
  loaded = true;
}
loadEnv();

let dbInstance = null;
function getDbClient() {
  if (!dbInstance) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_AUTH_TOKEN;
    if (!url) {
      throw new Error("TURSO_DB_URL environment variable is not set");
    }
    console.log(`[DB] Connecting to Turso: ${url.slice(0, 30)}...`);
    const start = performance.now();
    dbInstance = createClient({
      url,
      authToken
    });
    console.log(`[DB] Client created in ${(performance.now() - start).toFixed(2)}ms`);
  }
  return dbInstance;
}
const db = {
  execute: async (sql, args) => {
    const client = getDbClient();
    const start = performance.now();
    const shortSql = sql.replace(/\s+/g, " ").slice(0, 60);
    console.log(`[DB] Executing: ${shortSql}...`);
    try {
      const result = await client.execute(sql, args);
      console.log(`[DB] Query completed in ${(performance.now() - start).toFixed(2)}ms, rows: ${result.rows.length}`);
      return result;
    } catch (error) {
      console.error(`[DB] Query failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
      throw error;
    }
  },
  batch: (sqls) => {
    console.log(`[DB] Batch executing ${sqls.length} queries`);
    return getDbClient().batch(sqls);
  },
  transaction: () => {
    return getDbClient().transaction();
  },
  migrate: () => {
    return getDbClient().migrate();
  },
  close: () => {
    return getDbClient().close();
  }
};

function mapRowToArticle(row) {
  let tags = [];
  if (row.tags) {
    if (Array.isArray(row.tags)) {
      tags = row.tags;
    } else if (typeof row.tags === "string") {
      try {
        tags = JSON.parse(row.tags);
      } catch {
        tags = [];
      }
    }
  }
  return {
    id: row.id,
    beehiivPostId: row.beehiiv_post_id,
    beehiivPublicationId: row.beehiiv_publication_id,
    title: row.title,
    subtitle: row.subtitle ?? void 0,
    publishDate: row.publish_date,
    status: row.status,
    tags,
    thumbnailUrl: row.thumbnail_url ?? void 0,
    webUrl: row.web_url ?? void 0,
    summary: row.summary ?? void 0,
    shortSummary: row.short_summary ?? void 0,
    content: row.content ?? void 0
  };
}
function mapRowToPerson(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url ?? void 0,
    company: row.company ?? null
  };
}
function combineArticleWithPeople(article, people) {
  return {
    ...article,
    authors: people.filter((p) => p.role === "author").map((p) => p.person),
    featured: people.filter((p) => p.role === "featured").map((p) => p.person)
  };
}

const cache = /* @__PURE__ */ new Map();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1e3;
function getCacheKey(prefix, ...parts) {
  return `${prefix}:${parts.join(":")}`;
}
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  console.log(`[Cache] Hit for ${key} (${Math.round(age / 1e3)}s old)`);
  return entry.data;
}
function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[Cache] Set ${key}`);
}
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
}, 60 * 60 * 1e3);
async function getNewestArticles(count = 10, offset = 0) {
  const cacheKey = offset === 0 ? getCacheKey("newest", count) : null;
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  const result = await db.execute(
    `SELECT
       a.*,
       p.id as person_id, p.name, p.slug, p.image_url, p.company,
       ap.role,
       at.tag
     FROM articles a
     LEFT JOIN article_people ap ON a.id = ap.article_id
     LEFT JOIN people p ON ap.person_id = p.id
     LEFT JOIN article_tags at ON a.id = at.article_id
     ORDER BY a.publish_date DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [count, offset]
  );
  const articleMap = /* @__PURE__ */ new Map();
  for (const row of result.rows) {
    const articleId = row.id;
    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle({ ...row, tags: [] }),
        people: [],
        tags: /* @__PURE__ */ new Set()
      });
    }
    const entry = articleMap.get(articleId);
    if (row.person_id) {
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role
      });
    }
    const tag = row.tag;
    if (tag) {
      entry.tags.add(tag);
    }
  }
  const articles = Array.from(articleMap.values()).map(
    ({ article, people, tags }) => combineArticleWithPeople({ ...article, tags: Array.from(tags) }, people)
  );
  if (cacheKey) {
    setCached(cacheKey, articles);
  }
  return articles;
}
async function getArticlesByTags(count = 10, tags) {
  const cacheKey = getCacheKey("tags", count, tags?.length ? JSON.stringify([...tags].sort()) : "all");
  const cached = getCached(cacheKey);
  if (cached) return cached;
  let result;
  if (tags && tags.length > 0) {
    const tagPlaceholders = tags.map(() => "?").join(", ");
    const query = `SELECT
      a.*,
      p.id as person_id, p.name, p.slug, p.image_url, p.company,
      ap.role
    FROM articles a
    INNER JOIN article_tags at ON a.id = at.article_id
    LEFT JOIN article_people ap ON a.id = ap.article_id
    LEFT JOIN people p ON ap.person_id = p.id
    WHERE a.status = 'confirmed'
      AND at.tag IN (${tagPlaceholders})
    ORDER BY a.publish_date DESC, a.id DESC
    LIMIT ?`;
    result = await db.execute(query, [...tags, count]);
  } else {
    const query = `SELECT
      a.*,
      p.id as person_id, p.name, p.slug, p.image_url, p.company,
      ap.role
    FROM articles a
    LEFT JOIN article_people ap ON a.id = ap.article_id
    LEFT JOIN people p ON ap.person_id = p.id
    WHERE a.status = 'confirmed'
    ORDER BY a.publish_date DESC, a.id DESC
    LIMIT ?`;
    result = await db.execute(query, [count]);
  }
  const articleMap = /* @__PURE__ */ new Map();
  for (const row of result.rows) {
    const articleId = row.id;
    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle(row),
        people: []
      });
    }
    if (row.person_id) {
      const entry = articleMap.get(articleId);
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role
      });
    }
  }
  const articles = Array.from(articleMap.values()).map(
    ({ article, people }) => combineArticleWithPeople(article, people)
  );
  setCached(cacheKey, articles);
  return articles;
}
async function getArticlesByPublication(publicationId, limit, cursor) {
  const cacheKey = getCacheKey("pub", publicationId, limit);
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  let query = `SELECT
    a.*,
    p.id as person_id, p.name, p.slug, p.image_url, p.company,
    ap.role,
    at.tag
  FROM articles a
  LEFT JOIN article_people ap ON a.id = ap.article_id
  LEFT JOIN people p ON ap.person_id = p.id
  LEFT JOIN article_tags at ON a.id = at.article_id
  WHERE a.beehiiv_publication_id = ?`;
  const params = [publicationId];
  query += ` ORDER BY a.publish_date DESC, a.id DESC LIMIT ?`;
  params.push(limit + 1);
  const result = await db.execute(query, params);
  const rows = result.rows;
  const hasMore = rows.length > limit;
  const articleMap = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const articleId = row.id;
    if (!articleMap.has(articleId)) {
      articleMap.set(articleId, {
        article: mapRowToArticle({ ...row, tags: [] }),
        people: [],
        tags: /* @__PURE__ */ new Set()
      });
    }
    const entry = articleMap.get(articleId);
    if (row.person_id) {
      entry.people.push({
        person: mapRowToPerson({
          id: row.person_id,
          name: row.name,
          slug: row.slug,
          image_url: row.image_url,
          company: row.company
        }),
        role: row.role
      });
    }
    const tag = row.tag;
    if (tag) {
      entry.tags.add(tag);
    }
  }
  const articleEntries = Array.from(articleMap.values());
  const limitedEntries = hasMore ? articleEntries.slice(0, limit) : articleEntries;
  const articlesWithPeople = limitedEntries.map(
    ({ article, people, tags }) => combineArticleWithPeople({ ...article, tags: Array.from(tags) }, people)
  );
  let nextCursor;
  if (hasMore && articlesWithPeople.length > 0) {
    const lastArticle = articlesWithPeople[articlesWithPeople.length - 1];
    const cursorData = {
      ts: lastArticle.publishDate,
      id: lastArticle.id
    };
    nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
  }
  const returnResult = {
    articles: articlesWithPeople,
    hasMore,
    nextCursor
  };
  if (cacheKey) {
    setCached(cacheKey, returnResult);
  }
  return returnResult;
}

export { getArticlesByPublication as a, getArticlesByTags as b, getNewestArticles as g };
