// Frontwire is about web development: an AI article belongs in the archive only if it is about a model
// release or something developers build with. Titles are all the pipeline has (no scraping), and a
// classifier would cost money, so the test is a keyword match on the title. See the stage 4 spec.

// A model family followed by a version: `GPT-6`, `GPT 5.6`, `GPT‑5.6` (OpenAI's non-breaking hyphen),
// `o3`, `Claude Opus 5`, `Fable 5.1`, `Gemini Omni 1.1`, `DeepSeek-R2`, `Qwen 3.8`…
const MODEL_VERSION =
  /gpt[-‑ ]?\d|\bo\d\b|\bclaude(?: (?:opus|sonnet|haiku|fable|mythos))? ?\d|\b(?:opus|sonnet|haiku|fable|mythos) \d|\bgemini(?: [a-z]+)*[ -]?\d|\bgemma ?\d|\bdeepseek[- ]?[vr]?\d|\bllama ?\d|\bqwen ?\d/i;

// Words that put an AI story in a developer's hands, including the frontend vocabulary.
const DEVELOPER_TERM =
  /\b(?:apis?|sdks?|cli|codex|claude code|coding|developers?|mcp|webgpu|javascript|typescript|open[- ]weights?|react|vue(?:\.js)?|nuxt|next\.js|vite|svelte(?:kit)?)\b/i;

/** Whether an AI article titled `title` names a versioned model or a developer term, whole words, any case. */
export function isDeveloperRelevant(title: string): boolean {
  return MODEL_VERSION.test(title) || DEVELOPER_TERM.test(title);
}
