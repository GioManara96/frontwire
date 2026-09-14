export type SourceKind = "rss" | "github-release" | "hn" | "devto";

export type SourceDefinition = {
  name: string;
  kind: SourceKind;
  icon: string;
};

export const SOURCES = {
  "nuxt-releases": {
    name: "Nuxt releases",
    kind: "github-release",
    icon: "simple-icons:nuxt",
  },
  "openai-news": {
    name: "OpenAI News",
    kind: "rss",
    icon: "simple-icons:openai",
  },
  devto: {
    name: "DEV Community",
    kind: "devto",
    icon: "simple-icons:devdotto",
  },
  hackernews: {
    name: "Hacker News",
    kind: "hn",
    icon: "simple-icons:ycombinator",
  },
} as const satisfies Record<string, SourceDefinition>;

export type SourceId = keyof typeof SOURCES;
