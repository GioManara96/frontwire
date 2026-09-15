import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { hackerNewsUrl } from "../../../pipeline/hackernews";
import { runPipeline } from "../../../pipeline/pipeline";
import type { Article } from "../../../shared/types/article";

const NOW = new Date("2026-09-15T12:00:00Z");

const NEXTJS_BLOG = "https://nextjs.org/feed.xml";
const OPENAI_NEWS = "https://openai.com/news/rss.xml";
const NUXT_RELEASES = "https://github.com/nuxt/nuxt/releases.atom";
const HACKER_NEWS = hackerNewsUrl(NOW);

const EMPTY_RSS =
  '<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title>' +
  "<link>https://example.com</link><description>Empty</description></channel></rss>";
const EMPTY_ATOM =
  '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><id>empty</id>' +
  "<title>Empty</title><updated>2026-09-15T00:00:00Z</updated></feed>";
const EMPTY_SEARCH = '{"hits":[]}';

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/feeds/${name}`, import.meta.url), "utf8");
}

function rss(items: string): string {
  return (
    '<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><link>https://example.com</link>' +
    `<description>Feed</description>${items}</channel></rss>`
  );
}

function item(title: string, link: string, category = ""): string {
  return (
    `<item><title>${title}</title><link>${link}</link>` +
    `${category ? `<category>${category}</category>` : ""}<pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate></item>`
  );
}

/** Serves the given bodies (or throws the given errors) and an empty response of the right shape for every other URL. */
function fakeFetch(responses: Record<string, string | Error> = {}) {
  const requested: string[] = [];
  const fetchText = async (url: string) => {
    requested.push(url);
    const response = responses[url];
    if (response instanceof Error) throw response;
    if (response !== undefined) return response;
    if (url === HACKER_NEWS) return EMPTY_SEARCH;
    return url.endsWith(".atom") ? EMPTY_ATOM : EMPTY_RSS;
  };
  return { fetchText, requested };
}

// rss.xml yields 5 valid blog posts, of which the archive keeps the 3 newest; atom-releases.xml yields 3 releases.
const FIXTURES = { [NEXTJS_BLOG]: fixture("rss.xml"), [NUXT_RELEASES]: fixture("atom-releases.xml") };

describe("runPipeline", () => {
  it("requests every source once, Hacker News through its Algolia search", async () => {
    const { fetchText, requested } = fakeFetch();
    await runPipeline({ existing: [], now: NOW, fetchText });
    expect(requested).toHaveLength(21);
    expect(new Set(requested).size).toBe(21);
    expect(requested).toContain(HACKER_NEWS);
  });

  it("imports the newest articles of every feed, newest first, and reports the counts", async () => {
    const { fetchText } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [], now: NOW, fetchText });
    expect(result.articles.map((article) => article.title)).toEqual([
      "Echoed title",
      "Title only",
      "Only encoded content",
      "Nuxt v4.4.0",
      "Nuxt v4.5.2",
      "Nuxt v4.5.1",
    ]);
    expect(result).toMatchObject({ added: 6, removed: 0, skipped: 10, warnings: [] });
  });

  it("imports Hacker News stories, leaving a story that links to a blog post with the blog", async () => {
    const blogPost = rss(item("Claude Fable 5.1 is out", "https://www.anthropic.com/claude-fable-and-mythos-5-1"));
    const { fetchText } = fakeFetch({ [NEXTJS_BLOG]: blogPost, [HACKER_NEWS]: fixture("hackernews.json") });
    const result = await runPipeline({ existing: [], now: NOW, fetchText });

    const shared = result.articles.filter(
      (article) => article.id === articleId("https://www.anthropic.com/claude-fable-and-mythos-5-1"),
    );
    expect(shared.map((article) => article.sourceId)).toEqual(["nextjs-blog"]);
    // The three newest HN stories left once the duplicate and the irrelevant AI story are gone.
    expect(
      result.articles.filter((article) => article.sourceId === "hackernews").map((article) => article.title),
    ).toEqual([
      "Ask HN: Is anyone still writing Vue 2?",
      "Show HN: A Svelte playground in one file",
      "HTML Can Do That",
    ]);
  });

  it("drops AI articles that do not matter to web developers and counts them as skipped", async () => {
    const news = rss(
      item("Introducing the Agents API", "https://openai.com/index/agents-api/", "Product") +
        item("Introducing ChatGPT for Financial Services", "https://openai.com/index/finance/", "Product"),
    );
    const { fetchText } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: news });
    const result = await runPipeline({ existing: [], now: NOW, fetchText });
    const titles = result.articles.map((article) => article.title);
    expect(titles).toContain("Introducing the Agents API");
    expect(titles).not.toContain("Introducing ChatGPT for Financial Services");
    expect(result.skipped).toBe(11);
  });

  it("keeps stored articles untouched and drops the ones outside the window", async () => {
    const stored: Article = {
      id: articleId("https://github.com/nuxt/nuxt/releases/tag/v4.5.2"),
      title: "Stored title",
      url: "https://github.com/nuxt/nuxt/releases/tag/v4.5.2",
      sourceId: "nuxt-releases",
      publishedAt: "2026-09-05T16:19:44.000Z",
      category: "frontend",
      tags: ["nuxt", "release"],
    };
    const expired: Article = {
      ...stored,
      id: "eeeeeeeeeeee",
      title: "Expired",
      publishedAt: "2026-07-01T00:00:00.000Z",
    };
    const { fetchText } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [stored, expired], now: NOW, fetchText });
    expect(result.articles).toContainEqual(stored);
    expect(result.articles.map((article) => article.title)).not.toContain("Expired");
    expect(result).toMatchObject({ added: 5, removed: 1 });
  });

  it("keeps the article of the first source in registry order when two sources share a URL", async () => {
    const duplicate = rss(item("Duplicate", "https://nextjs.org/blog/echoed-title", "Product"));
    const { fetchText } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: duplicate });
    const result = await runPipeline({ existing: [], now: NOW, fetchText });
    const matches = result.articles.filter((article) => article.url === "https://nextjs.org/blog/echoed-title");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.sourceId).toBe("nextjs-blog");
  });

  it("turns a failing source into a warning and imports the others", async () => {
    const { fetchText } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: new Error("HTTP 503") });
    const result = await runPipeline({ existing: [], now: NOW, fetchText });
    expect(result.warnings).toEqual(["openai-news: HTTP 503"]);
    expect(result.added).toBe(6);
  });

  it("turns a response that cannot be parsed into a warning, feed or search alike", async () => {
    const { fetchText } = fakeFetch({ [NEXTJS_BLOG]: fixture("broken.xml"), [HACKER_NEWS]: "<html>Busy</html>" });
    const result = await runPipeline({ existing: [], now: NOW, fetchText });
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/^nextjs-blog: /);
    expect(result.warnings[1]).toMatch(/^hackernews: /);
  });

  it("fails when every source fails", async () => {
    const fetchText = async () => {
      throw new Error("offline");
    };
    await expect(runPipeline({ existing: [], now: NOW, fetchText })).rejects.toThrow(/every source failed/i);
  });
});
