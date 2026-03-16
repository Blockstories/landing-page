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
  free_web_content?: string;
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
  expand?: string[];
}

export interface CustomFieldValue {
  name?: string;
  value?: string;
}

export type SubscriptionTier = "free" | "premium";

export type SubscriptionStatus =
  | "validating"
  | "invalid"
  | "pending"
  | "active"
  | "inactive"
  | "needs_attention";

export interface CreateSubscriptionRequest {
  email: string;
  reactivate_existing?: boolean;
  send_welcome_email?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referring_site?: string;
  referral_code?: string;
  custom_fields?: CustomFieldValue[];
  double_opt_override?: "on" | "off" | "not_set";
  tier?: SubscriptionTier;
  premium_tiers?: string[];
  premium_tier_ids?: string[];
}

export interface Subscription {
  id: string;
  email: string;
  status: SubscriptionStatus;
  created: number;
  subscription_tier: SubscriptionTier;
  subscription_premium_tier_names: string[];
  utm_source: string;
  utm_medium: string;
  utm_channel: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referring_site: string;
  referral_code: string;
}

export interface SubscriptionResponse {
  data: Subscription;
}

export async function getPostByPublicationIdAndPostId(
  pubId: string,
  postId: string,
  expand?: string[]
): Promise<BeehiivPost> {
  const params = new URLSearchParams();
  if (expand) {
    for (const field of expand) {
      params.append("expand", field);
    }
  }

  const queryString = params.toString();
  const url = `${BEEHIIV_BASE_URL}/publications/${pubId}/posts/${postId}${queryString ? "?" + queryString : ""}`;

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
  if (options.expand) {
    for (const field of options.expand) {
      params.append("expand", field);
    }
  }

  const queryString = params.toString();
  const url = `${BEEHIIV_BASE_URL}/publications/${pubId}/posts${queryString ? "?" + queryString : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });

  return handleResponse<BeehiivPostsResponse>(response);
}

export async function createSubscription(
  pubId: string,
  request: CreateSubscriptionRequest
): Promise<Subscription> {
  const url = `${BEEHIIV_BASE_URL}/publications/${pubId}/subscriptions`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request)
  });

  const result = await handleResponse<SubscriptionResponse>(response);
  return result.data;
}
