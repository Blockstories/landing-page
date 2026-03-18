// /db/types.ts
export type ArticleStatus = "draft" | "confirmed" | "scheduled" | "archived";
export type ArticleRole = "author" | "featured";
export type ReportRole = "author" | "featured";

export interface Article {
  id: number;
  beehiivPostId: string;
  beehiivPublicationId: string;
  title: string;
  subtitle?: string;
  authors: Person[];
  featured: Person[];
  publishDate: number;
  status: ArticleStatus;
  tags: string[];
  thumbnailUrl?: string;
  webUrl?: string;
  summary?: string;
  shortSummary?: string;
  content?: string;
}

export interface Person {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  company?: string | null;
  description?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
}

export interface Report {
  id: number;
  title: string;
  subtitle?: string;
  authors: Person[];
  featured: Person[];
  publishDate: number;
  tags: string[];
  thumbnailUrl?: string;
  webUrl?: string;
  summary?: string;
  shortSummary?: string;
  content?: string;
}

export interface Event {
  id: number;
  title: string;
  thumbnailUrl?: string;
  webUrl?: string;
  timeframeString?: string;
  location?: string;
  date: number;
  tags: string[];
}