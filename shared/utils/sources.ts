/** Fetch adapter for a source. Not a display label. */
export type SourceKind = "rss" | "github-release" | "hn" | "devto";

export type SourceDefinition = {
  /** Display name in the archive and detail pages. */
  name: string;
  kind: SourceKind;
  /** Iconify icon name; later also the cover fallback when the article has no image. */
  icon: string;
};

// Same `as const satisfies` contract as TAGS: closed keys, checked entry shape.
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

/** Stable id stored on each article. Adding a source means adding a key here. */
export type SourceId = keyof typeof SOURCES;
