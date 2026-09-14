import { describe, expect, it } from "vitest";
import rawArticles from "../../data/articles.json";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";

// The data is validated here because TypeScript can't do it: imported JSON gets loose inferred types.
const articles = rawArticles as Array<Record<string, unknown>>;

const REQUIRED_FIELDS = ["id", "title", "url", "sourceId", "publishedAt", "category", "tags"];
const OPTIONAL_FIELDS = ["excerpt", "summary", "contentHtml", "discussionUrl", "coverImageUrl"];
const TEXT_FIELDS = ["excerpt", "summary", "contentHtml"];
const URL_FIELDS = ["url", "discussionUrl", "coverImageUrl"];
const CATEGORIES = ["frontend", "ai"];
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function sourceKind(article: Record<string, unknown>) {
  return SOURCES[article.sourceId as keyof typeof SOURCES]?.kind;
}

describe("data/articles.json", () => {
  it("contains at least one article", () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = articles.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(articles.map((article) => [String(article.id), article] as const))("article %s", (_id, article) => {
    it("has only known fields, and omits missing ones instead of using null", () => {
      for (const [key, value] of Object.entries(article)) {
        expect([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]).toContain(key);
        expect(value, `${key} must be omitted, not null`).not.toBeNull();
      }
    });

    it("has every required field", () => {
      for (const field of REQUIRED_FIELDS) expect(article).toHaveProperty(field);
    });

    it("has a 12-character hex id", () => {
      expect(article.id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("has a non-empty title", () => {
      expect(typeof article.title).toBe("string");
      expect((article.title as string).trim()).not.toBe("");
    });

    it("has a valid ISO 8601 UTC publication date", () => {
      expect(article.publishedAt).toMatch(ISO_UTC);
      expect(Number.isNaN(Date.parse(article.publishedAt as string))).toBe(false);
    });

    it("has a known category", () => {
      expect(CATEGORIES).toContain(article.category);
    });

    it("has at least one tag, all from the vocabulary, none repeated", () => {
      expect(Array.isArray(article.tags)).toBe(true);
      const tags = article.tags as unknown[];
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(Object.keys(TAGS)).toContain(tag);
      expect(new Set(tags).size).toBe(tags.length);
    });

    it("comes from a registered source", () => {
      expect(Object.keys(SOURCES)).toContain(article.sourceId);
    });

    it("uses absolute http(s) URLs", () => {
      for (const field of URL_FIELDS) {
        if (field in article) expect(isHttpUrl(article[field]), field).toBe(true);
      }
    });

    it("has no empty text fields", () => {
      for (const field of TEXT_FIELDS) {
        if (field in article) expect((article[field] as string).trim(), field).not.toBe("");
      }
    });

    it("has contentHtml only if it is a GitHub release", () => {
      if ("contentHtml" in article) expect(sourceKind(article)).toBe("github-release");
    });

    it("has discussionUrl only if it comes from Hacker News", () => {
      if ("discussionUrl" in article) expect(sourceKind(article)).toBe("hn");
    });
  });
});
