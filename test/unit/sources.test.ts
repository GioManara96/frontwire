import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";

// Plain records: the test checks what the registry contains, whatever TypeScript shape it has.
const sources = SOURCES as unknown as Record<string, Record<string, unknown>>;

// The registry of the stage 3 and 4 specs, in registry order. Order matters: on duplicate URLs the first source wins.
const FEEDS = {
  "nuxt-blog": { kind: "blog", feedUrl: "https://nuxt.com/blog/rss.xml", category: "frontend", tags: ["nuxt"] },
  "nextjs-blog": { kind: "blog", feedUrl: "https://nextjs.org/feed.xml", category: "frontend", tags: ["nextjs"] },
  "react-blog": { kind: "blog", feedUrl: "https://react.dev/rss.xml", category: "frontend", tags: ["react"] },
  "vite-blog": { kind: "blog", feedUrl: "https://vite.dev/blog.rss", category: "frontend", tags: ["vite"] },
  "svelte-blog": { kind: "blog", feedUrl: "https://svelte.dev/blog/rss.xml", category: "frontend", tags: ["svelte"] },
  "typescript-blog": {
    kind: "blog",
    feedUrl: "https://devblogs.microsoft.com/typescript/feed/",
    category: "frontend",
    tags: ["typescript"],
  },
  "openai-news": {
    kind: "blog",
    feedUrl: "https://openai.com/news/rss.xml",
    category: "ai",
    tags: ["openai"],
    // Product and Research are the news; the rest of the feed is customer stories, policy and company posts.
    feedCategories: ["Product", "Research"],
  },
  "huggingface-blog": {
    kind: "blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    category: "ai",
    tags: ["huggingface"],
  },
  "deepmind-blog": {
    kind: "blog",
    feedUrl: "https://deepmind.google/blog/rss.xml",
    category: "ai",
    tags: ["deepmind"],
  },
  "anthropic-news": {
    kind: "blog",
    feedUrl: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
    category: "ai",
    tags: ["anthropic"],
  },
  "this-week-in-react": {
    kind: "blog",
    feedUrl: "https://thisweekinreact.com/newsletter/rss.xml",
    category: "frontend",
    tags: ["react"],
    excerpt: false,
  },
  "javascript-weekly": {
    kind: "blog",
    feedUrl: "https://cprss.s3.amazonaws.com/javascriptweekly.com.xml",
    category: "frontend",
    tags: ["javascript"],
    excerpt: false,
  },
  "frontend-focus": {
    kind: "blog",
    feedUrl: "https://cprss.s3.amazonaws.com/frontendfoc.us.xml",
    category: "frontend",
    tags: ["web-platform"],
    excerpt: false,
  },
  "simon-willison": { kind: "blog", feedUrl: "https://simonwillison.net/atom/entries/" },
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

// Sources whose category and tags come from each article's title.
const TITLE_ONLY = ["simon-willison", "hackernews"];

const require = createRequire(import.meta.url);

function iconExists(name: string): boolean {
  const [collection, icon] = name.split(":");
  const { icons, aliases = {} } = require(`@iconify-json/${collection}/icons.json`);
  return icon !== undefined && (icon in icons || icon in aliases);
}

describe("SOURCES", () => {
  it("lists the feed sources in the order of the specs, then Hacker News", () => {
    expect(Object.keys(SOURCES)).toEqual([...Object.keys(FEEDS), "hackernews"]);
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

  it("gives a source a category and at least one default tag together, or neither", () => {
    for (const [id, source] of Object.entries(sources)) {
      expect("category" in source, id).toBe("tags" in source);
      if ("tags" in source) expect((source.tags as unknown[]).length, id).toBeGreaterThan(0);
    }
  });

  it("reads the category and tags of simon-willison and hackernews from the title", () => {
    const titleOnly = Object.keys(sources).filter((id) => !("category" in sources[id]!));
    expect(titleOnly).toEqual(TITLE_ONLY);
  });

  it("turns excerpts off only for the newsletters", () => {
    const withoutExcerpt = Object.keys(sources).filter((id) => "excerpt" in sources[id]!);
    expect(withoutExcerpt).toEqual(["this-week-in-react", "javascript-weekly", "frontend-focus"]);
  });

  it("reads Hacker News through its API, not a feed", () => {
    expect(sources.hackernews).toMatchObject({ kind: "hn" });
    expect(sources.hackernews).not.toHaveProperty("feedUrl");
  });

  it("no longer has dev.to", () => {
    expect(Object.values(sources).map((source) => source.kind)).not.toContain("devto");
  });
});

describe("TAGS", () => {
  it("has a DeepMind tag", () => {
    expect(TAGS).toHaveProperty("deepmind", { label: "DeepMind", icon: "simple-icons:deepmind" });
  });

  it("has JavaScript and web platform tags, right after TypeScript", () => {
    expect(TAGS).toHaveProperty("javascript", { label: "JavaScript", icon: "simple-icons:javascript" });
    expect(TAGS).toHaveProperty("web-platform", { label: "Web platform", icon: "material-symbols-light:web" });
    const ids = Object.keys(TAGS);
    expect(ids.slice(ids.indexOf("typescript"), ids.indexOf("typescript") + 3)).toEqual([
      "typescript",
      "javascript",
      "web-platform",
    ]);
  });
});

describe("icons", () => {
  it("exist in the installed Iconify collections", () => {
    const names = [...Object.values(sources), ...Object.values(TAGS)].map((entry) => String(entry.icon));
    for (const name of names) expect(iconExists(name), name).toBe(true);
  });
});
