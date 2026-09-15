import { describe, expect, it } from "vitest";
import { isWithinWindow, mergeArticles } from "../../../pipeline/merge";
import type { Article } from "../../../shared/types/article";

const NOW = new Date("2026-09-15T12:00:00Z");

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: "000000000000",
    title: "Title",
    url: "https://example.com/post",
    sourceId: "nextjs-blog",
    publishedAt: "2026-09-10T00:00:00.000Z",
    category: "frontend",
    tags: ["nextjs"],
    ...overrides,
  };
}

describe("isWithinWindow", () => {
  it("includes an article published exactly 30 days ago", () => {
    expect(isWithinWindow("2026-08-16T12:00:00.000Z", NOW)).toBe(true);
  });

  it("excludes an article published one second earlier", () => {
    expect(isWithinWindow("2026-08-16T11:59:59.000Z", NOW)).toBe(false);
  });

  it("includes dates in the future", () => {
    expect(isWithinWindow("2026-09-16T00:00:00.000Z", NOW)).toBe(true);
  });
});

describe("mergeArticles", () => {
  it("adds incoming articles with new ids", () => {
    const stored = makeArticle({ id: "aaaaaaaaaaaa" });
    const fresh = makeArticle({ id: "bbbbbbbbbbbb" });
    expect(mergeArticles([stored], [fresh], NOW).map((article) => article.id)).toEqual([
      "aaaaaaaaaaaa",
      "bbbbbbbbbbbb",
    ]);
  });

  it("never overwrites an article that is already in the archive", () => {
    const stored = makeArticle({ id: "aaaaaaaaaaaa", title: "Stored", excerpt: "Stored excerpt." });
    const fresh = makeArticle({ id: "aaaaaaaaaaaa", title: "Edited upstream" });
    expect(mergeArticles([stored], [fresh], NOW)).toEqual([stored]);
  });

  it("keeps the first incoming article when two sources share an id", () => {
    const first = makeArticle({ id: "aaaaaaaaaaaa", sourceId: "nextjs-blog" });
    const second = makeArticle({ id: "aaaaaaaaaaaa", sourceId: "openai-news" });
    expect(mergeArticles([], [first, second], NOW)).toEqual([first]);
  });

  it("drops stored and incoming articles outside the 30-day window", () => {
    const oldStored = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-08-01T00:00:00.000Z" });
    const oldIncoming = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-08-02T00:00:00.000Z" });
    const recent = makeArticle({ id: "cccccccccccc" });
    expect(mergeArticles([oldStored], [oldIncoming, recent], NOW)).toEqual([recent]);
  });

  it("orders from newest to oldest, then by id when dates are equal", () => {
    const older = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-09-01T00:00:00.000Z" });
    const newest = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-14T00:00:00.000Z" });
    const tieB = makeArticle({ id: "dddddddddddd", publishedAt: "2026-09-10T00:00:00.000Z" });
    const tieA = makeArticle({ id: "cccccccccccc", publishedAt: "2026-09-10T00:00:00.000Z" });
    const ids = mergeArticles([older, tieB], [newest, tieA], NOW).map((article) => article.id);
    expect(ids).toEqual(["bbbbbbbbbbbb", "cccccccccccc", "dddddddddddd", "aaaaaaaaaaaa"]);
  });

  it("does not modify the arrays it receives", () => {
    const existing = [makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-01T00:00:00.000Z" })];
    const incoming = [
      makeArticle({ id: "aaaaaaaaaaaa" }),
      makeArticle({ id: "cccccccccccc", publishedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const snapshot = structuredClone({ existing, incoming });
    mergeArticles(existing, incoming, NOW);
    expect({ existing, incoming }).toEqual(snapshot);
  });

  it("produces byte-identical JSON when nothing changed", () => {
    const incoming = [
      makeArticle({ id: "aaaaaaaaaaaa" }),
      makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-12T00:00:00.000Z" }),
    ];
    const firstRun = mergeArticles([], incoming, NOW);
    const secondRun = mergeArticles(firstRun, incoming, NOW);
    expect(JSON.stringify(secondRun, null, 2)).toBe(JSON.stringify(firstRun, null, 2));
  });
});
