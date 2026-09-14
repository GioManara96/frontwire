import { describe, expect, it } from "vitest";
import { getArticleText } from "../../shared/utils/article-text";

describe("getArticleText", () => {
  it("prefers the AI summary over the feed excerpt", () => {
    expect(getArticleText({ summary: "Summary.", excerpt: "Excerpt." })).toBe("Summary.");
  });

  it("falls back to the excerpt when there is no summary", () => {
    expect(getArticleText({ excerpt: "Excerpt." })).toBe("Excerpt.");
  });

  it("returns undefined when the source provided no text", () => {
    expect(getArticleText({})).toBeUndefined();
  });
});
