export type TagDefinition = { label: string; icon: string };

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

export type TagId = keyof typeof TAGS;
