import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
export { renderers } from '../../renderers.mjs';

let dbInstance = null;
function getDbClient() {
  if (!dbInstance) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_AUTH_TOKEN;
    if (!url) {
      throw new Error("TURSO_DB_URL environment variable is not set");
    }
    dbInstance = createClient({
      url,
      authToken
    });
  }
  return dbInstance;
}
const db = {
  execute: (sql, args) => {
    return getDbClient().execute(sql, args);
  },
  batch: (sqls) => {
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
  return {
    id: row.id,
    beehiivPostId: row.beehiiv_post_id,
    beehiivPublicationId: row.beehiiv_publication_id,
    title: row.title,
    subtitle: row.subtitle ?? void 0,
    publishDate: row.publish_date,
    status: row.status,
    tags: row.tags ? JSON.parse(row.tags) : [],
    thumbnailUrl: row.thumbnail_url ?? void 0,
    webUrl: row.web_url ?? void 0,
    summary: row.summary ?? void 0,
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

async function getPeopleForArticle(articleId) {
  const result = await db.execute(
    `SELECT p.id, p.name, p.slug, p.image_url, p.company, ap.role
     FROM people p
     JOIN article_people ap ON p.id = ap.person_id
     WHERE ap.article_id = ?`,
    [articleId]
  );
  return result.rows.map((row) => ({
    person: mapRowToPerson(row),
    role: row.role
  }));
}
async function getNewestArticles(count = 10, offset = 0) {
  const result = await db.execute(
    "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ? OFFSET ?",
    [count, offset]
  );
  const articles = result.rows.map(mapRowToArticle);
  const articlesWithPeople = await Promise.all(
    articles.map(async (article) => {
      const people = await getPeopleForArticle(article.id);
      return combineArticleWithPeople(article, people);
    })
  );
  return articlesWithPeople;
}

config({ path: resolve(process.cwd(), "../.env") });
const GET = async ({ request }) => {
  const url = new URL(request.url);
  let limit = 10;
  let offset = 0;
  const limitParam = url.searchParams.get("limit");
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100);
    }
  }
  const offsetParam = url.searchParams.get("offset");
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }
  try {
    const articles = await getNewestArticles(limit, offset);
    return new Response(JSON.stringify({ articles, count: articles.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[API] Error fetching articles:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
