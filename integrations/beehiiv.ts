const BEEHIIV_BASE_URL = process.env.BEEHIIV_BASE_URL || "https://api.beehiiv.com/v2";

export interface BeehiivPost {
  id: string;
  publication_id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  created: number;
  updated: number;
  published: number | null;
  status: "draft" | "confirmed" | "scheduled" | "archived";
  url: string;
  web_url: string;
  audience: string;
  content?: {
    html?: string;
    markdown?: string;
  };
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
    headers: {
      Authorization: `Bearer ${process.env.BEEHIIV_BEARER_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Beehiiv API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result = (await response.json()) as { data: BeehiivPost };
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
    headers: {
      Authorization: `Bearer ${process.env.BEEHIIV_BEARER_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Beehiiv API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return (await response.json()) as BeehiivPostsResponse;
}
