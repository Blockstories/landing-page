-- Add company column to people table
ALTER TABLE people ADD COLUMN company TEXT;

-- Down migration (for rollback):
-- ALTER TABLE people DROP COLUMN company;
