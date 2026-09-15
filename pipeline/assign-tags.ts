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
  ["openai", /\b(?:openai|chatgpt|gpt[-‑]?\d)/i],
  ["anthropic", /\b(?:anthropic|claude)\b/i],
  ["deepseek", /\bdeepseek\b/i],
  ["huggingface", /\bhugging\s?face\b/i],
  ["gemini", /\bgemini\b/i],
  ["deepmind", /\bdeepmind\b/i],
];

/** Tags for an article: the source's `defaults` first, then every tag whose keyword appears in `title`, without duplicates. */
export function assignTags(title: string, defaults: readonly TagId[]): TagId[] {
  const tags = [...defaults];
  for (const [tag, pattern] of KEYWORD_RULES) {
    if (pattern.test(title) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}
