// /db/types.ts
export type ArticleStatus = "draft" | "confirmed" | "scheduled" | "archived";
export type ArticleRole = "author" | "featured";

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
  content?: string;
}

export interface Person {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
}