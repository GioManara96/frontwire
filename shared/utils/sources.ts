import type { Category } from "../types/article";
import type { TagId } from "./tags";

/** Fetch adapter for a source. Not a display label. */
export type SourceKind = "rss" | "github-release" | "hn" | "devto";

type SourceBase = {
  /** Display name in the archive and detail pages. */
  name: string;
  /** Iconify icon name; also the cover fallback when an article has no image. */
  icon: string;
};

/** What the import pipeline needs to read a source as an RSS or Atom feed. */
type FeedFields = {
  feedUrl: string;
  /** Category of every article from this source. */
  category: Category;
  /** Tags every article from this source gets; the pipeline adds keyword tags from the title. Never empty. */
  tags: readonly TagId[];
};

export type SourceDefinition =
  | (SourceBase &
      FeedFields & {
        kind: "rss";
        /** If set, only items with at least one of these feed categories are imported; uncategorized items are skipped. */
        feedCategories?: readonly string[];
      })
  | (SourceBase &
      FeedFields & {
        kind: "github-release";
        /** Title prefix for releases: `Nuxt` makes `Nuxt v4.5.2`. */
        project: string;
      })
  // No adapter yet: the pipeline skips these sources.
  | (SourceBase & { kind: "hn" | "devto" });

// Same `as const satisfies` contract as TAGS: closed keys, checked entry shape.
// Key order is the import priority: when two sources carry the same URL, the first one keeps the article.
export const SOURCES = {
  "nuxt-blog": {
    name: "Nuxt blog",
    kind: "rss",
    icon: "simple-icons:nuxt",
    feedUrl: "https://nuxt.com/blog/rss.xml",
    category: "frontend",
    tags: ["nuxt"],
  },
  "nextjs-blog": {
    name: "Next.js blog",
    kind: "rss",
    icon: "simple-icons:nextdotjs",
    feedUrl: "https://nextjs.org/feed.xml",
    category: "frontend",
    tags: ["nextjs"],
  },
  "react-blog": {
    name: "React blog",
    kind: "rss",
    icon: "simple-icons:react",
    feedUrl: "https://react.dev/rss.xml",
    category: "frontend",
    tags: ["react"],
  },
  "vite-blog": {
    name: "Vite blog",
    kind: "rss",
    icon: "simple-icons:vite",
    feedUrl: "https://vite.dev/blog.rss",
    category: "frontend",
    tags: ["vite"],
  },
  "svelte-blog": {
    name: "Svelte blog",
    kind: "rss",
    icon: "simple-icons:svelte",
    feedUrl: "https://svelte.dev/blog/rss.xml",
    category: "frontend",
    tags: ["svelte"],
  },
  "typescript-blog": {
    name: "TypeScript blog",
    kind: "rss",
    icon: "simple-icons:typescript",
    feedUrl: "https://devblogs.microsoft.com/typescript/feed/",
    category: "frontend",
    tags: ["typescript"],
  },
  "openai-news": {
    name: "OpenAI News",
    kind: "rss",
    icon: "simple-icons:openai",
    feedUrl: "https://openai.com/news/rss.xml",
    category: "ai",
    tags: ["openai"],
    // The news; the rest of the feed is customer stories, policy and company posts (about 3 in 4).
    feedCategories: ["Product", "Research"],
  },
  "huggingface-blog": {
    name: "Hugging Face blog",
    kind: "rss",
    icon: "simple-icons:huggingface",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    category: "ai",
    tags: ["huggingface"],
  },
  "deepmind-blog": {
    name: "Google DeepMind blog",
    kind: "rss",
    icon: "simple-icons:deepmind",
    feedUrl: "https://deepmind.google/blog/rss.xml",
    category: "ai",
    tags: ["deepmind"],
  },
  // Community mirror: Anthropic publishes no official feed, so this one may disappear.
  "anthropic-news": {
    name: "Anthropic News",
    kind: "rss",
    icon: "simple-icons:anthropic",
    feedUrl: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
    category: "ai",
    tags: ["anthropic"],
  },
  "nuxt-releases": {
    name: "Nuxt releases",
    kind: "github-release",
    icon: "simple-icons:nuxt",
    feedUrl: "https://github.com/nuxt/nuxt/releases.atom",
    project: "Nuxt",
    category: "frontend",
    tags: ["nuxt", "release"],
  },
  "vue-releases": {
    name: "Vue releases",
    kind: "github-release",
    icon: "simple-icons:vuedotjs",
    feedUrl: "https://github.com/vuejs/core/releases.atom",
    project: "Vue",
    category: "frontend",
    tags: ["vue", "release"],
  },
  "nextjs-releases": {
    name: "Next.js releases",
    kind: "github-release",
    icon: "simple-icons:nextdotjs",
    feedUrl: "https://github.com/vercel/next.js/releases.atom",
    project: "Next.js",
    category: "frontend",
    tags: ["nextjs", "release"],
  },
  "react-releases": {
    name: "React releases",
    kind: "github-release",
    icon: "simple-icons:react",
    feedUrl: "https://github.com/facebook/react/releases.atom",
    project: "React",
    category: "frontend",
    tags: ["react", "release"],
  },
  "vite-releases": {
    name: "Vite releases",
    kind: "github-release",
    icon: "simple-icons:vite",
    feedUrl: "https://github.com/vitejs/vite/releases.atom",
    project: "Vite",
    category: "frontend",
    tags: ["vite", "release"],
  },
  "typescript-releases": {
    name: "TypeScript releases",
    kind: "github-release",
    icon: "simple-icons:typescript",
    feedUrl: "https://github.com/microsoft/TypeScript/releases.atom",
    project: "TypeScript",
    category: "frontend",
    tags: ["typescript", "release"],
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

/** Sources the import pipeline fetches: those with a `feedUrl`. */
export type FeedSourceId = {
  [K in SourceId]: (typeof SOURCES)[K] extends { feedUrl: string } ? K : never;
}[SourceId];
