import { describe, expect, it } from "vitest";
import {
  countTags,
  filterArticles,
  filtersToQuery,
  opensOriginal,
  parseFilters,
  toggleTag,
} from "../../app/utils/article-filters";
import type { ArticleListItem } from "../../shared/types/article";

function item(id: string, overrides: Partial<ArticleListItem> = {}): ArticleListItem {
  return {
    id,
    title: `Article ${id}`,
    url: `https://example.com/${id}`,
    sourceId: "nuxt-blog",
    publishedAt: "2026-09-10T00:00:00Z",
    category: "frontend",
    tags: ["nuxt"],
    ...overrides,
  };
}

const nuxt = item("nuxt");
const react = item("react", { tags: ["react", "nextjs"] });
const vue = item("vue", { tags: ["vue", "release"] });
const openai = item("openai", { category: "ai", tags: ["openai"] });
const claudeReact = item("claude-react", { category: "ai", tags: ["react", "anthropic"] });
const ALL = [nuxt, react, vue, openai, claudeReact];

const ids = (items: ArticleListItem[]) => items.map((article) => article.id);

describe("parseFilters", () => {
  it("reads a category and a comma-separated list of tags", () => {
    expect(parseFilters({ category: "ai", tags: "react,vue" })).toEqual({ category: "ai", tags: ["vue", "react"] });
  });

  it("returns no filter for an empty query", () => {
    expect(parseFilters({})).toEqual({ category: undefined, tags: [] });
  });

  it("ignores unknown categories and tags, and repeated tags", () => {
    expect(parseFilters({ category: "backend", tags: "react,cobol,react" })).toEqual({
      category: undefined,
      tags: ["react"],
    });
  });

  it("keeps tags in vocabulary order whatever the URL order", () => {
    expect(parseFilters({ tags: "openai,vue,nuxt" }).tags).toEqual(["nuxt", "vue", "openai"]);
  });

  it("accepts the array and null values a router query can hold", () => {
    expect(parseFilters({ category: ["frontend", "ai"], tags: ["react", null, "vue"] })).toEqual({
      category: "frontend",
      tags: ["vue", "react"],
    });
    expect(parseFilters({ category: null, tags: null })).toEqual({ category: undefined, tags: [] });
  });
});

describe("filtersToQuery", () => {
  it("writes the category and the tags in vocabulary order", () => {
    expect(filtersToQuery({ category: "ai", tags: ["openai", "react"] })).toEqual({
      category: "ai",
      tags: "react,openai",
    });
  });

  it("omits the keys of filters that are not set", () => {
    expect(filtersToQuery({ category: undefined, tags: [] })).toEqual({});
    expect(filtersToQuery({ category: undefined, tags: ["vue"] })).toEqual({ tags: "vue" });
  });

  it("round-trips through parseFilters", () => {
    const filters = { category: "frontend" as const, tags: ["react" as const, "release" as const] };
    expect(parseFilters(filtersToQuery(filters))).toEqual(filters);
  });
});

describe("filterArticles", () => {
  it("returns every article when no filter is set", () => {
    expect(ids(filterArticles(ALL, { category: undefined, tags: [] }))).toEqual(ids(ALL));
  });

  it("keeps the articles of a category", () => {
    expect(ids(filterArticles(ALL, { category: "ai", tags: [] }))).toEqual(["openai", "claude-react"]);
  });

  it("keeps the articles that have at least one of the tags", () => {
    expect(ids(filterArticles(ALL, { category: undefined, tags: ["vue", "openai"] }))).toEqual(["vue", "openai"]);
  });

  it("combines category and tags: the category and at least one tag", () => {
    expect(ids(filterArticles(ALL, { category: "frontend", tags: ["react"] }))).toEqual(["react"]);
  });

  it("does not modify the array it receives", () => {
    const input = [...ALL];
    filterArticles(input, { category: "ai", tags: ["react"] });
    expect(input).toEqual(ALL);
  });
});

describe("countTags", () => {
  it("counts the articles per tag, most frequent first, then in vocabulary order", () => {
    expect(countTags(ALL)).toEqual([
      { tag: "react", count: 2 },
      { tag: "nuxt", count: 1 },
      { tag: "vue", count: 1 },
      { tag: "nextjs", count: 1 },
      { tag: "openai", count: 1 },
      { tag: "anthropic", count: 1 },
      { tag: "release", count: 1 },
    ]);
  });

  it("leaves out tags no article has", () => {
    expect(countTags([nuxt]).map((entry) => entry.tag)).toEqual(["nuxt"]);
    expect(countTags([])).toEqual([]);
  });
});

describe("toggleTag", () => {
  it("adds a tag that is not active, keeping the category", () => {
    expect(toggleTag({ category: "ai", tags: ["react"] }, "openai")).toEqual({
      category: "ai",
      tags: ["react", "openai"],
    });
  });

  it("removes a tag that is active", () => {
    expect(toggleTag({ category: undefined, tags: ["react", "vue"] }, "react")).toEqual({
      category: undefined,
      tags: ["vue"],
    });
  });

  it("does not modify the filters it receives", () => {
    const filters = { category: undefined, tags: ["react" as const] };
    toggleTag(filters, "vue");
    expect(filters.tags).toEqual(["react"]);
  });
});

describe("opensOriginal", () => {
  it("is true for articles without an excerpt: the detail page would have nothing to show", () => {
    expect(opensOriginal(item("hn", { sourceId: "hackernews" }))).toBe(true);
  });

  it("is false for articles with an excerpt", () => {
    expect(opensOriginal(item("post", { excerpt: "Some text." }))).toBe(false);
  });
});
