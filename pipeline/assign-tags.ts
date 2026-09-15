import type { Category } from "../shared/types/article";
import type { SourceDefinition } from "../shared/utils/sources";
import type { TagId } from "../shared/utils/tags";

// In vocabulary order, which is the order tags are appended in. Whole words, any case.
// OpenAI often writes `GPT‑5` with a non-breaking hyphen (U+2011) instead of `-`.
const KEYWORD_RULES: ReadonlyArray<readonly [TagId, RegExp]> = [
  ["nuxt", /\bnuxt\b/i],
  ["vue", /\bvue(?:\.js)?\b/i],
  ["react", /\breact\b/i],
  ["nextjs", /\bnext\.js\b/i],
  ["vite", /\bvite\b/i],
  ["svelte", /\bsvelte(?:kit)?\b/i],
  ["typescript", /\btypescript\b/i],
  ["javascript", /\bjavascript\b/i],
  ["web-platform", /\b(?:css|html|webassembly|wasm)\b/i],
  ["openai", /\b(?:openai|chatgpt|gpt[-‑]?\d)/i],
  ["anthropic", /\b(?:anthropic|claude)\b/i],
  ["deepseek", /\bdeepseek\b/i],
  ["huggingface", /\bhugging\s?face\b/i],
  ["gemini", /\bgemini\b/i],
  ["deepmind", /\bdeepmind\b/i],
];

// Tags that make an article an AI one when its source does not fix the category.
const AI_TAGS: ReadonlySet<TagId> = new Set(["openai", "anthropic", "deepseek", "huggingface", "gemini", "deepmind"]);

/** Tags for an article: the source's `defaults` first, then every tag whose keyword appears in `title`, without duplicates. */
export function assignTags(title: string, defaults: readonly TagId[]): TagId[] {
  const tags = [...defaults];
  for (const [tag, pattern] of KEYWORD_RULES) {
    if (pattern.test(title) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

/** `ai` if any of `tags` names an AI company or model family, even alongside frontend tags; `frontend` otherwise. */
export function categoryOf(tags: readonly TagId[]): Category {
  return tags.some((tag) => AI_TAGS.has(tag)) ? "ai" : "frontend";
}

/**
 * Category and tags of an article titled `title` from `source`. A source that fixes its category keeps
 * it and gets its default tags plus the keyword ones. A source that fixes neither gets the keyword tags
 * and the category they imply; `undefined` when the title has no keyword, so the article is skipped.
 */
export function topicOf(title: string, source: SourceDefinition): { category: Category; tags: TagId[] } | undefined {
  if (source.category) return { category: source.category, tags: assignTags(title, source.tags ?? []) };
  const tags = assignTags(title, []);
  return tags.length > 0 ? { category: categoryOf(tags), tags } : undefined;
}
