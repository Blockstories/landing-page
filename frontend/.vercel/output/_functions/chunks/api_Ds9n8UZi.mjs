async function fetchArticles(options = {}) {
  const { limit = 10, offset = 0, baseUrl = "" } = options;
  const url = new URL("/api/articles", baseUrl || window.location.origin);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
function filterArticlesByPublication(articles, publicationId) {
  return articles.filter(
    (article) => article.beehiivPublicationId === publicationId
  );
}

export { filterArticlesByPublication as a, fetchArticles as f };
