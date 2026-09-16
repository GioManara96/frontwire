import { describe, expect, it } from "vitest";
import {
  addFavorite,
  isFavorite,
  parseFavorites,
  removeFavorite,
  serializeFavorites,
  toSaved,
  type SavedArticle,
} from "../../app/utils/favorites";
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

function saved(id: string, overrides: Partial<SavedArticle> = {}): SavedArticle {
  return { ...toSaved(item(id), "2026-09-16T08:00:00.000Z"), ...overrides };
}

/** The stored string for `list`, the shape parseFavorites reads. */
function stored(list: readonly unknown[]): string {
  return JSON.stringify(list);
}

describe("toSaved", () => {
  it("copies the article and stamps when it was saved", () => {
    expect(toSaved(item("a"), "2026-09-16T08:00:00.000Z")).toEqual({
      id: "a",
      title: "Article a",
      url: "https://example.com/a",
      sourceId: "nuxt-blog",
      publishedAt: "2026-09-10T00:00:00Z",
      category: "frontend",
      tags: ["nuxt"],
      savedAt: "2026-09-16T08:00:00.000Z",
    });
  });

  it("keeps the optional fields the article has, and only those", () => {
    const withExtras = toSaved(
      item("b", { excerpt: "Text", coverImageUrl: "https://example.com/b.png", discussionUrl: "https://hn/b" }),
      "2026-09-16T08:00:00.000Z",
    );
    expect(withExtras).toMatchObject({
      excerpt: "Text",
      coverImageUrl: "https://example.com/b.png",
      discussionUrl: "https://hn/b",
    });
    expect(toSaved(item("c"), "2026-09-16T08:00:00.000Z")).not.toHaveProperty("excerpt");
  });
});

describe("parseFavorites", () => {
  it("reads back what serializeFavorites wrote", () => {
    const list = [saved("a"), saved("b", { excerpt: "Text" })];
    expect(parseFavorites(serializeFavorites(list))).toEqual(list);
  });

  it("is empty when nothing was ever stored", () => {
    expect(parseFavorites(null)).toEqual([]);
  });

  it("is empty when the stored value is not JSON or not an array", () => {
    expect(parseFavorites("{oops")).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    expect(parseFavorites('"a"')).toEqual([]);
  });

  it("drops an entry whose source or tag is not in the vocabulary, and keeps the others", () => {
    const list = stored([saved("a"), { ...saved("b"), sourceId: "gone" }, { ...saved("c"), tags: ["nuxt", "kotlin"] }]);
    expect(parseFavorites(list).map((article) => article.id)).toEqual(["a"]);
  });

  it("drops an entry with a missing or mistyped field", () => {
    const { title: _title, ...noTitle } = saved("b");
    const list = stored([saved("a"), noTitle, { ...saved("c"), savedAt: 1 }, { ...saved("d"), tags: "nuxt" }, null]);
    expect(parseFavorites(list).map((article) => article.id)).toEqual(["a"]);
  });

  it("drops an entry whose optional field has the wrong type", () => {
    const list = stored([saved("a"), { ...saved("b"), excerpt: 12 }]);
    expect(parseFavorites(list).map((article) => article.id)).toEqual(["a"]);
  });

  it("keeps an unknown category out", () => {
    const list = stored([{ ...saved("a"), category: "sports" }]);
    expect(parseFavorites(list)).toEqual([]);
  });
});

describe("addFavorite", () => {
  it("puts the newest save first", () => {
    const list = addFavorite(addFavorite([], saved("a")), saved("b"));
    expect(list.map((article) => article.id)).toEqual(["b", "a"]);
  });

  it("does not duplicate or move an article already saved", () => {
    const list = [saved("b"), saved("a")];
    expect(addFavorite(list, saved("a", { savedAt: "2026-09-17T08:00:00.000Z" }))).toEqual(list);
  });

  it("leaves the list it receives alone", () => {
    const list = [saved("a")];
    addFavorite(list, saved("b"));
    expect(list.map((article) => article.id)).toEqual(["a"]);
  });
});

describe("removeFavorite", () => {
  it("removes only that article and keeps the order of the others", () => {
    const list = [saved("c"), saved("b"), saved("a")];
    expect(removeFavorite(list, "b").map((article) => article.id)).toEqual(["c", "a"]);
  });

  it("returns an equal list for an id that is not saved", () => {
    const list = [saved("a")];
    expect(removeFavorite(list, "z")).toEqual(list);
  });
});

describe("isFavorite", () => {
  it("tells a saved id from one that is not", () => {
    const list = [saved("a")];
    expect(isFavorite(list, "a")).toBe(true);
    expect(isFavorite(list, "b")).toBe(false);
  });
});
