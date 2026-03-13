-- Add normalized tags table for efficient tag-based queries
-- This replaces the slow json_extract(tags, '$') LIKE ? pattern

-- Create junction table for article tags (many-to-many)
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (article_id, tag),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Index for fast tag lookups: WHERE tag = ? ORDER BY article_id DESC
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_article
ON article_tags(tag, article_id DESC);

-- Index for finding tags by article (used when updating/deleting)
CREATE INDEX IF NOT EXISTS idx_article_tags_article
ON article_tags(article_id);

-- Populate article_tags from existing articles JSON data
INSERT OR IGNORE INTO article_tags (article_id, tag)
SELECT
    articles.id as article_id,
    json_each.value as tag
FROM articles, json_each(articles.tags)
WHERE articles.tags IS NOT NULL
  AND json_type(articles.tags) = 'array';
