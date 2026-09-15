import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";

// Plain records: the test checks what the registry contains, whatever TypeScript shape it has.
const sources = SOURCES as unknown as Record<string, Record<string, unknown>>;

// The registry of the stage 3 spec, in registry order. Order matters: on duplicate URLs the first source wins.
const FEEDS = {
  "nuxt-blog": { kind: "rss", feedUrl: "https://nuxt.com/blog/rss.xml", category: "frontend", tags: ["nuxt"] },
  "nextjs-blog": { kind: "rss", feedUrl: "https://nextjs.org/feed.xml", category: "frontend", tags: ["nextjs"] },
  "react-blog": { kind: "rss", feedUrl: "https://react.dev/rss.xml", category: "frontend", tags: ["react"] },
  "vite-blog": { kind: "rss", feedUrl: "https://vite.dev/blog.rss", category: "frontend", tags: ["vite"] },
  "svelte-blog": { kind: "rss", feedUrl: "https://svelte.dev/blog/rss.xml", category: "frontend", tags: ["svelte"] },
  "typescript-blog": {
    kind: "rss",
    feedUrl: "https://devblogs.microsoft.com/typescript/feed/",
    category: "frontend",
    tags: ["typescript"],
  },
  "openai-news": { kind: "rss", feedUrl: "https://openai.com/news/rss.xml", category: "ai", tags: ["openai"] },
  "huggingface-blog": {
    kind: "rss",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    category: "ai",
    tags: ["huggingface"],
  },
  "deepmind-blog": { kind: "rss", feedUrl: "https://deepmind.google/blog/rss.xml", category: "ai", tags: ["deepmind"] },
  "anthropic-news": {
    kind: "rss",
    feedUrl: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
    category: "ai",
    tags: ["anthropic"],
  },
  "nuxt-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/nuxt/nuxt/releases.atom",
    project: "Nuxt",
    category: "frontend",
    tags: ["nuxt", "release"],
  },
  "vue-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vuejs/core/releases.atom",
    project: "Vue",
    category: "frontend",
    tags: ["vue", "release"],
  },
  "nextjs-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vercel/next.js/releases.atom",
    project: "Next.js",
    category: "frontend",
    tags: ["nextjs", "release"],
  },
  "react-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/facebook/react/releases.atom",
    project: "React",
    category: "frontend",
    tags: ["react", "release"],
  },
  "vite-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vitejs/vite/releases.atom",
    project: "Vite",
    category: "frontend",
    tags: ["vite", "release"],
  },
  "typescript-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/microsoft/TypeScript/releases.atom",
    project: "TypeScript",
    category: "frontend",
    tags: ["typescript", "release"],
  },
};

const require = createRequire(import.meta.url);

function iconExists(name: string): boolean {
  const [collection, icon] = name.split(":");
  const { icons, aliases = {} } = require(`@iconify-json/${collection}/icons.json`);
  return icon !== undefined && (icon in icons || icon in aliases);
}

describe("SOURCES", () => {
  it("lists the feed sources in the order of the spec, then the API sources", () => {
    expect(Object.keys(SOURCES)).toEqual([...Object.keys(FEEDS), "devto", "hackernews"]);
  });

  it.each(Object.entries(FEEDS))("registers %s as the spec says", (id, expected) => {
    expect(sources[id]).toMatchObject(expected);
  });

  it("gives every source a display name", () => {
    for (const source of Object.values(sources)) expect(String(source.name).trim()).not.toBe("");
  });

  it("gives a title prefix only to release sources", () => {
    for (const source of Object.values(sources)) {
      if (source.kind === "github-release") expect(String(source.project).trim()).not.toBe("");
      else expect(source).not.toHaveProperty("project");
    }
  });

  it("keeps devto and hackernews without a feed until their adapters exist", () => {
    expect(sources.devto).not.toHaveProperty("feedUrl");
    expect(sources.hackernews).not.toHaveProperty("feedUrl");
  });
});

describe("TAGS", () => {
  it("has a DeepMind tag", () => {
    expect(TAGS).toHaveProperty("deepmind", { label: "DeepMind", icon: "simple-icons:deepmind" });
  });
});

describe("icons", () => {
  it("exist in the installed Iconify collections", () => {
    const names = [...Object.values(sources), ...Object.values(TAGS)].map((entry) => String(entry.icon));
    for (const name of names) expect(iconExists(name), name).toBe(true);
  });
});
