import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";

// Expected values computed with the reference algorithm of the stage 1 spec.
const POST_ID = "061128ccde4c"; // https://example.com/post

describe("articleId", () => {
  it("is the first 12 hex characters of the SHA-256 of the normalized URL", () => {
    expect(articleId("https://example.com/post")).toBe(POST_ID);
    expect(articleId("https://github.com/nuxt/nuxt/releases/tag/v4.5.2")).toBe("fafd2b5b0000");
  });

  it("lowercases the host and drops a leading www.", () => {
    expect(articleId("https://www.Example.com/post")).toBe(POST_ID);
  });

  it("keeps the case of the path", () => {
    expect(articleId("https://example.com/Post")).toBe("faa5bccd9b3e");
  });

  it("drops the fragment", () => {
    expect(articleId("https://example.com/post#comments")).toBe(POST_ID);
  });

  it("drops utm_* and ref tracking parameters", () => {
    expect(articleId("https://example.com/post?utm_source=rss&utm_medium=feed&ref=hn")).toBe(POST_ID);
  });

  it("keeps other parameters, sorted", () => {
    expect(articleId("https://example.com/post?b=2&a=1")).toBe("4151d26c579d");
    expect(articleId("https://example.com/post?a=1&b=2")).toBe("4151d26c579d");
    expect(articleId("https://example.com/post?referrer=x")).not.toBe(POST_ID);
  });

  it("drops the trailing slash, except for the root", () => {
    expect(articleId("https://example.com/post/")).toBe(POST_ID);
    expect(articleId("https://example.com/")).toBe("0f115db062b7");
    expect(articleId("https://example.com")).toBe("0f115db062b7");
  });
});
