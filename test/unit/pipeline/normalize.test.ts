import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { normalizeFeed } from "../../../pipeline/normalize";

const NOW = new Date("2026-09-15T12:00:00Z");

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/feeds/${name}`, import.meta.url), "utf8");
}

function byTitle(xml: string, sourceId: Parameters<typeof normalizeFeed>[1]) {
  const { articles } = normalizeFeed(xml, sourceId, NOW);
  return new Map(articles.map((article) => [article.title, article]));
}

describe("normalizeFeed: blog posts (rss)", () => {
  const rss = fixture("rss.xml");

  it("turns an item into an article with the source's category and tags", () => {
    expect(byTitle(rss, "nextjs-blog").get("Next.js 16.4")).toEqual({
      id: articleId("https://nextjs.org/blog/next-16-4"),
      title: "Next.js 16.4",
      url: "https://nextjs.org/blog/next-16-4",
      sourceId: "nextjs-blog",
      publishedAt: "2026-09-04T16:00:00.000Z",
      category: "frontend",
      tags: ["nextjs"],
      excerpt: "Next.js 16.4 improves Turbopack build times and stabilizes the new caching APIs.",
    });
  });

  it("keeps the original URL and derives the id from its normalized form", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.url).toBe("https://nextjs.org/blog/rsc-guide?utm_source=rss#intro");
    expect(article?.id).toBe(articleId("https://nextjs.org/blog/rsc-guide"));
  });

  it("converts dates with a time zone offset to UTC", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.publishedAt).toBe("2026-09-10T07:30:00.000Z");
  });

  it("adds keyword tags from the title", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.tags).toEqual(["nextjs", "react"]);
  });

  it("turns a long HTML description into a plain-text excerpt of at most 300 characters", () => {
    const excerpt = byTitle(rss, "nextjs-blog").get("Building with React Server Components")?.excerpt ?? "";
    expect(excerpt.startsWith("Server Components & streaming change how data reaches the browser.")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(300);
    expect(excerpt).not.toContain("<");
  });

  it("falls back to content:encoded when there is no description", () => {
    expect(byTitle(rss, "nextjs-blog").get("Only encoded content")?.excerpt).toBe("Encoded body text.");
  });

  it("omits the excerpt when there is no text or it only repeats the title", () => {
    const articles = byTitle(rss, "nextjs-blog");
    expect(articles.get("Title only")).not.toHaveProperty("excerpt");
    expect(articles.get("Echoed title")).not.toHaveProperty("excerpt");
  });

  it("never gives blog posts release notes or a cover they did not provide", () => {
    for (const article of byTitle(rss, "nextjs-blog").values()) {
      expect(article).not.toHaveProperty("contentHtml");
      expect(article).not.toHaveProperty("coverImageUrl");
    }
  });

  it("skips items outside the window, without an absolute link, or with an invalid date", () => {
    const { articles, skipped } = normalizeFeed(rss, "nextjs-blog", NOW);
    expect(articles.map((article) => article.title)).toEqual([
      "Next.js 16.4",
      "Building with React Server Components",
      "Only encoded content",
      "Title only",
      "Echoed title",
    ]);
    expect(skipped).toBe(4);
  });
});

describe("normalizeFeed: covers (rss)", () => {
  const articles = byTitle(fixture("rss-media.xml"), "deepmind-blog");

  it("prefers an image from media:content", () => {
    expect(articles.get("Cover from media content")?.coverImageUrl).toBe("https://deepmind.google/img/content.jpg");
  });

  it("uses media:thumbnail when there is no media:content image", () => {
    expect(articles.get("Cover from thumbnail")?.coverImageUrl).toBe("https://deepmind.google/img/thumbnail.jpg");
  });

  it("uses an image enclosure as the last option", () => {
    expect(articles.get("Cover from enclosure")?.coverImageUrl).toBe("https://deepmind.google/img/enclosure.png");
  });

  it("ignores enclosures that are not images", () => {
    expect(articles.get("Audio enclosure")).not.toHaveProperty("coverImageUrl");
  });

  it("ignores relative image URLs and moves on to the next candidate", () => {
    expect(articles.get("Relative media URL")?.coverImageUrl).toBe("https://deepmind.google/img/fallback.png");
  });

  it("uses the category and default tags of the source", () => {
    const article = articles.get("Cover from media content");
    expect(article?.category).toBe("ai");
    expect(article?.tags).toEqual(["deepmind"]);
  });
});

describe("normalizeFeed: GitHub releases (atom)", () => {
  const atom = fixture("atom-releases.xml");

  it("keeps only stable releases, in feed order, and counts the rest as skipped", () => {
    const { articles, skipped } = normalizeFeed(atom, "nuxt-releases", NOW);
    expect(articles.map((article) => article.title)).toEqual(["Nuxt v4.5.2", "Nuxt v4.4.0", "Nuxt v4.5.1"]);
    // rc, canary, create-vite@…, dropped/…, v6.0-rc, and one older than the window.
    expect(skipped).toBe(6);
  });

  it("builds the title from the project and the tag, ignoring the feed title", () => {
    expect(byTitle(atom, "nuxt-releases").has("Nuxt v4.4.0")).toBe(true);
  });

  it("uses the release page as URL and source of the id", () => {
    const article = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2");
    expect(article?.url).toBe("https://github.com/nuxt/nuxt/releases/tag/v4.5.2");
    expect(article?.id).toBe("fafd2b5b0000");
    expect(article?.sourceId).toBe("nuxt-releases");
    expect(article?.category).toBe("frontend");
    expect(article?.tags).toEqual(["nuxt", "release"]);
  });

  it("prefers the published date and falls back to updated", () => {
    const articles = byTitle(atom, "nuxt-releases");
    expect(articles.get("Nuxt v4.4.0")?.publishedAt).toBe("2026-09-09T18:00:00.000Z");
    expect(articles.get("Nuxt v4.5.2")?.publishedAt).toBe("2026-09-05T16:19:44.000Z");
  });

  it("stores sanitized release notes", () => {
    const html = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")?.contentHtml ?? "";
    expect(html).toContain("<h3>🩹 Fixes</h3>");
    expect(html).toContain('<a href="https://github.com/nuxt/nuxt/pull/33001">#33001</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<img");
  });

  it("derives a plain-text excerpt from the release notes", () => {
    const excerpt = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")?.excerpt ?? "";
    expect(excerpt.startsWith("👉 Changelog compare changes 🩹 Fixes nuxt: Keep route params")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(300);
  });

  it("never uses the author's avatar as a cover", () => {
    expect(byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")).not.toHaveProperty("coverImageUrl");
  });

  it("omits release notes and excerpt when the release has no body", () => {
    const article = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.1");
    expect(article).not.toHaveProperty("contentHtml");
    expect(article).not.toHaveProperty("excerpt");
  });
});

describe("normalizeFeed: invalid input", () => {
  it("throws on XML that is not a feed", () => {
    expect(() => normalizeFeed(fixture("broken.xml"), "nextjs-blog", NOW)).toThrow();
  });

  it("throws when the feed format does not match the kind of source", () => {
    expect(() => normalizeFeed(fixture("atom-releases.xml"), "nextjs-blog", NOW)).toThrow(/RSS/);
    expect(() => normalizeFeed(fixture("rss.xml"), "nuxt-releases", NOW)).toThrow(/Atom/);
  });
});
