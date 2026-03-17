-- Create reports table similar to articles structure
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    publish_date INTEGER NOT NULL,
    subtitle TEXT,
    web_url TEXT,
    thumbnail_url TEXT,
    summary TEXT,
    short_summary TEXT,
    content TEXT
);

-- Create junction table for report-people relationships (many-to-many)
-- Similar to article_people table
CREATE TABLE IF NOT EXISTS report_people (
    report_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('author', 'featured')),
    PRIMARY KEY (report_id, person_id, role),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Create junction table for report tags (many-to-many)
-- Similar to article_tags table
CREATE TABLE IF NOT EXISTS report_tags (
    report_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (report_id, tag),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDICES (similar to articles table indices)
-- ============================================================================

-- Index for: ORDER BY publish_date DESC (used by getNewestReports)
CREATE INDEX IF NOT EXISTS idx_reports_date
ON reports(publish_date DESC, id DESC);

-- Index for report_people lookups (used by JOINs)
-- Similar to idx_article_people_article_id
CREATE INDEX IF NOT EXISTS idx_report_people_report_id
ON report_people(report_id);

-- Index for finding people by report
CREATE INDEX IF NOT EXISTS idx_report_people_person_id
ON report_people(person_id);

-- Index for fast tag lookups: WHERE tag = ? ORDER BY report_id DESC
-- Similar to idx_article_tags_tag_article
CREATE INDEX IF NOT EXISTS idx_report_tags_tag_report
ON report_tags(tag, report_id DESC);

-- Index for finding tags by report (used when updating/deleting)
-- Similar to idx_article_tags_article
CREATE INDEX IF NOT EXISTS idx_report_tags_report
ON report_tags(report_id);
