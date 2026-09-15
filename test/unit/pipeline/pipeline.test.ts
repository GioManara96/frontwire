import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { runPipeline } from "../../../pipeline/pipeline";
import type { Article } from "../../../shared/types/article";

const NOW = new Date("2026-09-15T12:00:00Z");

const NEXTJS_BLOG = "https://nextjs.org/feed.xml";
const OPENAI_NEWS = "https://openai.com/news/rss.xml";
const NUXT_RELEASES = "https://github.com/nuxt/nuxt/releases.atom";

const EMPTY_RSS =
  '<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title>' +
  "<link>https://example.com</link><description>Empty</description></channel></rss>";
const EMPTY_ATOM =
  '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><id>empty</id>' +
  "<title>Empty</title><updated>2026-09-15T00:00:00Z</updated></feed>";

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/feeds/${name}`, import.meta.url), "utf8");
}

/** Serves the given bodies (or throws the given errors) and an empty feed for every other URL. */
function fakeFetch(responses: Record<string, string | Error> = {}) {
  const requested: string[] = [];
  const fetchFeed = async (url: string) => {
    requested.push(url);
    const response = responses[url];
    if (response instanceof Error) throw response;
    return response ?? (url.endsWith(".atom") ? EMPTY_ATOM : EMPTY_RSS);
  };
  return { fetchFeed, requested };
}

const FIXTURES = { [NEXTJS_BLOG]: fixture("rss.xml"), [NUXT_RELEASES]: fixture("atom-releases.xml") };

describe("runPipeline", () => {
  it("requests every feed source once and skips the API sources", async () => {
    const { fetchFeed, requested } = fakeFetch();
    await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(requested).toHaveLength(16);
    expect(new Set(requested).size).toBe(16);
  });

  it("imports the articles of every feed, newest first, and reports the counts", async () => {
    const { fetchFeed } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.articles.map((article) => article.title)).toEqual([
      "Echoed title",
      "Title only",
      "Only encoded content",
      "Building with React Server Components",
      "Nuxt v4.4.0",
      "Nuxt v4.5.2",
      "Next.js 16.4",
      "Nuxt v4.5.1",
    ]);
    expect(result).toMatchObject({ added: 8, removed: 0, skipped: 10, warnings: [] });
  });

  it("keeps stored articles untouched and drops the ones outside the window", async () => {
    const stored: Article = {
      id: articleId("https://nextjs.org/blog/next-16-4"),
      title: "Stored title",
      url: "https://nextjs.org/blog/next-16-4",
      sourceId: "nextjs-blog",
      publishedAt: "2026-09-04T16:00:00.000Z",
      category: "frontend",
      tags: ["nextjs"],
    };
    const expired: Article = {
      ...stored,
      id: "eeeeeeeeeeee",
      title: "Expired",
      publishedAt: "2026-07-01T00:00:00.000Z",
    };
    const { fetchFeed } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [stored, expired], now: NOW, fetchFeed });
    expect(result.articles).toContainEqual(stored);
    expect(result.articles.map((article) => article.title)).not.toContain("Expired");
    expect(result).toMatchObject({ added: 7, removed: 1 });
  });

  it("keeps the article of the first source in registry order when two sources share a URL", async () => {
    const duplicate =
      '<?xml version="1.0"?><rss version="2.0"><channel><title>OpenAI</title><link>https://openai.com</link>' +
      "<description>News</description><item><title>Duplicate</title><link>https://nextjs.org/blog/next-16-4</link>" +
      "<pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>";
    const { fetchFeed } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: duplicate });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    const matches = result.articles.filter((article) => article.url === "https://nextjs.org/blog/next-16-4");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.sourceId).toBe("nextjs-blog");
  });

  it("turns a failing source into a warning and imports the others", async () => {
    const { fetchFeed } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: new Error("HTTP 503") });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.warnings).toEqual(["openai-news: HTTP 503"]);
    expect(result.added).toBe(8);
  });

  it("turns a feed that cannot be parsed into a warning", async () => {
    const { fetchFeed } = fakeFetch({ [NEXTJS_BLOG]: fixture("broken.xml") });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/^nextjs-blog: /);
  });

  it("fails when every source fails", async () => {
    const fetchFeed = async () => {
      throw new Error("offline");
    };
    await expect(runPipeline({ existing: [], now: NOW, fetchFeed })).rejects.toThrow(/every source failed/i);
  });
});
