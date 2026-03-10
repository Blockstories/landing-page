// /db/types.ts
export interface Article {
  id: number;
  beehiivPostId: string;
  beehiivPublicationId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publishDate: number;
  tags: string[];
  thumbnailUrl?: string;
  webUrl?: string;
  summary?: string;
  content?: string;
}