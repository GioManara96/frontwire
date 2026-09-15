import { describe, expect, it } from "vitest";
import { findArticle, listArticles } from "../../server/utils/articles";
import type { Article } from "../../shared/types/article";

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: "000000000000",
    title: "Title",
    url: "https://example.com/post",
    sourceId: "devto",
    publishedAt: "2026-09-01T00:00:00Z",
    category: "frontend",
    tags: ["vue"],
    ...overrides,
  };
}

const older = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-09-01T10:00:00Z" });
const newer = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-10T10:00:00Z", contentHtml: "<p>Notes</p>" });
const newest = makeArticle({ id: "cccccccccccc", publishedAt: "2026-09-14T10:00:00Z" });

describe("listArticles", () => {
  it("orders articles from newest to oldest", () => {
    const ids = listArticles([older, newest, newer]).map((article) => article.id);
    expect(ids).toEqual(["cccccccccccc", "bbbbbbbbbbbb", "aaaaaaaaaaaa"]);
  });

  it("leaves contentHtml out of every list item", () => {
    for (const item of listArticles([older, newest, newer])) expect(item).not.toHaveProperty("contentHtml");
  });

  it("does not reorder or modify the array it receives", () => {
    const input = [older, newest, newer];
    listArticles(input);
    expect(input).toEqual([older, newest, newer]);
    expect(newer.contentHtml).toBe("<p>Notes</p>");
  });
});

describe("findArticle", () => {
  it("returns the full article, contentHtml included", () => {
    expect(findArticle([older, newer], "bbbbbbbbbbbb")).toEqual(newer);
  });

  it("returns undefined for an unknown id", () => {
    expect(findArticle([older], "ffffffffffff")).toBeUndefined();
  });
});
