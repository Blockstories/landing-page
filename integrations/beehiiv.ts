const BEEHIIV_BASE_URL = process.env.BEEHIIV_BASE_URL || "https://api.beehiiv.com/v2";

function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.BEEHIIV_BEARER_TOKEN}`,
    "Content-Type": "application/json"
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Beehiiv API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
  return response.json() as Promise<T>;
}

export interface BeehiivPostContent {
  web: string;
  email: string;
  rss?: string;
}

export interface BeehiivPostContentTier {
  free: BeehiivPostContent;
  premium: Omit<BeehiivPostContent, 'rss'>;
}

export interface BeehiivPost {
  id: string;
  publication_id?: string;
  title: string;
  subtitle: string;
  authors: string[];
  created: number;
  status: "draft" | "confirmed" | "scheduled" | "archived";
  subject_line: string;
  preview_text: string;
  slug: string;
  thumbnail_url: string;
  web_url: string;
  audience: string;
  platform?: string;
  content_tags: string[];
  hidden_from_feed: boolean;
  publish_date: number | null;
  displayed_date: number | null;
  content?: BeehiivPostContentTier;
}

export interface BeehiivPostsResponse {
  data: BeehiivPost[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface GetPostsOptions {
  limit?: number;
  page?: number;
  status?: "draft" | "confirmed" | "scheduled" | "archived";
}

export async function getPostByPublicationIdAndPostId(
  pubId: string,
  postId: string
): Promise<BeehiivPost> {
  const url = `${BEEHIIV_BASE_URL}/publications/${pubId}/posts/${postId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });

  const result = await handleResponse<{ data: BeehiivPost }>(response);
  return result.data;
}

export async function getPostsByPublicationId(
  pubId: string,
  options: GetPostsOptions = {}
): Promise<BeehiivPostsResponse> {
  const params = new URLSearchParams();

  if (options.limit) params.append("limit", options.limit.toString());
  if (options.page) params.append("page", options.page.toString());
  if (options.status) params.append("status", options.status);

  const queryString = params.toString();
  const url = `${BEEHIIV_BASE_URL}/publications/${pubId}/posts${queryString ? "?" + queryString : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });

  return handleResponse<BeehiivPostsResponse>(response);
}
