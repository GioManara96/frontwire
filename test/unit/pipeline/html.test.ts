import { describe, expect, it } from "vitest";
import { htmlToText, sanitizeReleaseHtml, truncateText } from "../../../pipeline/html";

describe("sanitizeReleaseHtml", () => {
  it("keeps headings, paragraphs, lists, links, code and emphasis", () => {
    const html =
      '<h2>Features</h2><p>See <a href="https://github.com/nuxt/nuxt/pull/1">#1</a>.</p>' +
      "<ul><li><strong>bold</strong> <em>em</em> <code>useFetch</code></li></ul>" +
      "<pre><code>npm i nuxt</code></pre><blockquote><p>Note</p></blockquote>";
    expect(sanitizeReleaseHtml(html)).toBe(html);
  });

  it("drops scripts and styles together with their content", () => {
    expect(sanitizeReleaseHtml("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("<p>a</p>");
  });

  it("drops every attribute except a link's href", () => {
    const html =
      '<p id="x" class="y" style="color:red" onclick="evil()">a <a href="https://example.com" target="_blank">b</a></p>';
    expect(sanitizeReleaseHtml(html)).toBe('<p>a <a href="https://example.com">b</a></p>');
  });

  it("drops javascript: links but keeps their text", () => {
    expect(sanitizeReleaseHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("drops images", () => {
    expect(sanitizeReleaseHtml('<p>a <img src="https://example.com/x.png"> b</p>')).toBe("<p>a  b</p>");
  });

  it("unwraps tags outside the allowlist and keeps their text", () => {
    expect(sanitizeReleaseHtml("<details><summary>More</summary><p>hidden</p></details>")).toBe("More<p>hidden</p>");
  });
});

describe("htmlToText", () => {
  it("strips tags and separates block elements with a space", () => {
    expect(htmlToText("<h2>Fixes</h2><p>First</p><ul><li>one</li><li>two</li></ul>")).toBe("Fixes First one two");
  });

  it("keeps inline elements attached to the surrounding text", () => {
    expect(htmlToText("<p>use<strong>Fetch</strong> and <a href='#'>links</a></p>")).toBe("useFetch and links");
  });

  it("decodes entities", () => {
    expect(htmlToText("<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39; &nbsp;f</p>")).toBe(`a & b <c> "d" 'e' f`);
  });

  it("drops the content of scripts and styles", () => {
    expect(htmlToText("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("a");
  });

  it("collapses whitespace and trims", () => {
    expect(htmlToText("  a\n\n  b\t c  ")).toBe("a b c");
  });

  it("returns an empty string when there is no text", () => {
    expect(htmlToText("")).toBe("");
    expect(htmlToText("<p> </p>")).toBe("");
  });
});

describe("truncateText", () => {
  it("returns text within the limit unchanged", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("exactly10!", 10)).toBe("exactly10!");
  });

  it("cuts at the last word boundary and adds an ellipsis, staying within the limit", () => {
    const result = truncateText("The quick brown fox jumps", 12);
    expect(result).toBe("The quick…");
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it("drops punctuation left dangling before the ellipsis", () => {
    expect(truncateText("Hello, world again", 9)).toBe("Hello…");
  });

  it("cuts inside a word that has no space before the limit", () => {
    expect(truncateText("Supercalifragilistic", 10)).toBe("Supercali…");
  });
});
