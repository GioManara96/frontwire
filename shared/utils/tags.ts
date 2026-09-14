/**
 * One entry in the tag vocabulary.
 * `label` is the readable name (also `aria-label`/`title` when only the icon shows).
 * `icon` is an Iconify name (`collection:icon`).
 */
export type TagDefinition = { label: string; icon: string };

// Keep keys literal so TagId stays a closed vocabulary; check the entry shape without widening it.
export const TAGS = {
  nuxt: {
    label: "Nuxt",
    icon: "simple-icons:nuxt",
  },
  vue: {
    label: "Vue",
    icon: "simple-icons:vuedotjs",
  },
  react: {
    label: "React",
    icon: "simple-icons:react",
  },
  nextjs: {
    label: "Next.js",
    icon: "simple-icons:nextdotjs",
  },
  vite: {
    label: "Vite",
    icon: "simple-icons:vite",
  },
  svelte: {
    label: "Svelte",
    icon: "simple-icons:svelte",
  },
  typescript: {
    label: "TypeScript",
    icon: "simple-icons:typescript",
  },
  openai: {
    label: "OpenAI",
    icon: "simple-icons:openai",
  },
  anthropic: {
    label: "Anthropic",
    icon: "simple-icons:anthropic",
  },
  deepseek: {
    label: "DeepSeek",
    icon: "simple-icons:deepseek",
  },
  huggingface: {
    label: "Hugging Face",
    icon: "simple-icons:huggingface",
  },
  gemini: {
    label: "Gemini",
    icon: "simple-icons:googlegemini",
  },
  release: {
    label: "Release",
    icon: "material-symbols-light:rocket-launch-outline",
  },
} as const satisfies Record<string, TagDefinition>;

/** Closed vocabulary. An article's `tags` may only use these keys. */
export type TagId = keyof typeof TAGS;
