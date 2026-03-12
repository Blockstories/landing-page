import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "prompts");

export interface PromptConfig {
  template: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Parse frontmatter from markdown content.
 * Simple parser that handles key: value format.
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, body: content };
  }

  const frontmatter = match[1];
  const body = match[2].trim();
  const data: Record<string, unknown> = {};

  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      // Try to parse as number if it looks like one
      if (/^-?\d+\.?\d*$/.test(value)) {
        data[key] = parseFloat(value);
      } else {
        data[key] = value;
      }
    }
  }

  return { data, body };
}

/**
 * Load a prompt from the prompts directory.
 */
export function loadPrompt(name: string): PromptConfig {
  const filePath = join(PROMPTS_DIR, `${name}.md`);
  const content = readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(content);

  return {
    template: body,
    model: (data.model as string) || "gpt-4o-mini",
    temperature: data.temperature as number | undefined,
    maxTokens: data.max_tokens as number | undefined,
  };
}

/**
 * Fill in template variables in a prompt.
 * Variables use {{variableName}} syntax.
 */
export function fillPrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}
