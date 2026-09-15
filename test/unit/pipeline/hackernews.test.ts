import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { HN_MIN_POINTS, RETENTION_DAYS } from "../../../pipeline/config";
import { hackerNewsUrl, normalizeHackerNews } from "../../../pipeline/hackernews";

const NOW = new Date("2026-09-15T12:00:00Z");

const json = readFileSync(new URL("../../fixtures/feeds/hackernews.json", import.meta.url), "utf8");

function byTitle() {
  return new Map(normalizeHackerNews(json, NOW).articles.map((article) => [article.title, article]));
}

describe("hackerNewsUrl", () => {
  it("asks Algolia for the stories of the window above the point threshold, newest first", () => {
    const url = new URL(hackerNewsUrl(NOW));
    const since = Math.floor(NOW.getTime() / 1000) - RETENTION_DAYS * 24 * 60 * 60;
    expect(`${url.origin}${url.pathname}`).toBe("https://hn.algolia.com/api/v1/search_by_date");
    expect(url.searchParams.get("tags")).toBe("story");
    expect(url.searchParams.get("numericFilters")).toBe(`created_at_i>=${since},points>=${HN_MIN_POINTS}`);
    expect(url.searchParams.get("hitsPerPage")).toBe("1000");
  });

  it("has a threshold of 300 points", () => {
    expect(HN_MIN_POINTS).toBe(300);
  });
});

describe("normalizeHackerNews", () => {
  it("turns a story into an article with its link, discussion page and topic from the title", () => {
    const url = "https://www.anthropic.com/claude-fable-and-mythos-5-1?utm_source=hn";
    expect(byTitle().get("Claude Fable 5.1 and Claude Mythos 5.1")).toEqual({
      id: articleId(url),
      title: "Claude Fable 5.1 and Claude Mythos 5.1",
      url,
      sourceId: "hackernews",
      publishedAt: "2026-09-01T17:02:11.000Z",
      category: "ai",
      tags: ["anthropic"],
      discussionUrl: "https://news.ycombinator.com/item?id=49540001",
    });
  });

  it("files a story with only frontend keywords under frontend", () => {
    expect(byTitle().get("HTML Can Do That")).toMatchObject({ category: "frontend", tags: ["web-platform"] });
  });

  it("uses the discussion page as URL when the story has no absolute link", () => {
    const discussion = "https://news.ycombinator.com/item?id=49686380";
    expect(byTitle().get("Ask HN: Is anyone still writing Vue 2?")).toMatchObject({
      url: discussion,
      id: articleId(discussion),
      discussionUrl: discussion,
    });
    expect(byTitle().get("Show HN: A Svelte playground in one file")?.url).toBe(
      "https://news.ycombinator.com/item?id=49600008",
    );
  });

  it("never gives a story an excerpt or a cover, not even from an Ask HN text", () => {
    for (const article of byTitle().values()) {
      expect(article).not.toHaveProperty("excerpt");
      expect(article).not.toHaveProperty("coverImageUrl");
    }
  });

  it("leaves relevance to the pipeline: an AI story without a model or developer term is still normalized", () => {
    expect(byTitle().get("I resigned from Anthropic today")).toMatchObject({ category: "ai" });
  });

  it("skips stories without a vocabulary keyword, a title, enough points or a date in the window", () => {
    const { articles, skipped } = normalizeHackerNews(json, NOW);
    expect(articles.map((article) => article.title)).toEqual([
      "Ask HN: Is anyone still writing Vue 2?",
      "I resigned from Anthropic today",
      "Show HN: A Svelte playground in one file",
      "Claude Fable 5.1 and Claude Mythos 5.1",
      "HTML Can Do That",
    ]);
    expect(skipped).toBe(4);
  });

  it("throws on a body that is not an Algolia search result", () => {
    expect(() => normalizeHackerNews("<html>Rate limited</html>", NOW)).toThrow();
    expect(() => normalizeHackerNews('{"message":"Invalid request"}', NOW)).toThrow(/hits/);
  });
});
