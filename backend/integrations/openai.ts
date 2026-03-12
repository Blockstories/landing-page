const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function getAuthHeaders(): HeadersInit {
  return {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
  return response.json() as Promise<T>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

export interface GenerateOptions {
  model: string;
  prompt: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateCompletion(
  options: GenerateOptions
): Promise<ChatCompletionResponse> {
  const messages: ChatMessage[] = [];

  if (options.systemMessage) {
    messages.push({ role: "system", content: options.systemMessage });
  }

  messages.push({ role: "user", content: options.prompt });

  const requestBody: ChatCompletionRequest = {
    model: options.model,
    messages,
    ...(options.temperature !== undefined && { temperature: options.temperature }),
    ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens })
  };

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody)
  });

  return handleResponse<ChatCompletionResponse>(response);
}

export async function generateText(
  options: GenerateOptions
): Promise<string> {
  const result = await generateCompletion(options);
  return result.choices[0]?.message?.content || "";
}
