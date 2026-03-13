-- Add indexes for faster publication + date queries
-- This makes getArticlesByPublication() much faster by avoiding full table scans

-- Index for: WHERE beehiiv_publication_id = ? ORDER BY publish_date DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_articles_pub_date
ON articles(beehiiv_publication_id, publish_date DESC, id DESC);

-- Index for: ORDER BY publish_date DESC (used by getNewestArticles)
CREATE INDEX IF NOT EXISTS idx_articles_date
ON articles(publish_date DESC, id DESC);

-- Index for article_people lookups (used by JOINs)
CREATE INDEX IF NOT EXISTS idx_article_people_article_id
ON article_people(article_id);

-- Index for: WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?
CREATE INDEX IF NOT EXISTS idx_articles_pub_post
ON articles(beehiiv_publication_id, beehiiv_post_id);