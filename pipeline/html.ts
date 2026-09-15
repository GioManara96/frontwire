import sanitizeHtml from "sanitize-html";

// Enough to keep the structure of release notes; any other tag is unwrapped to its text.
const RELEASE_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "strong",
  "em",
  "b",
  "i",
];

// Tags whose boundaries separate words: without a space, `<h2>Fixes</h2><p>First` would read `FixesFirst`.
const BLOCK_TAG =
  /<\/?(?:p|div|h[1-6]|li|ul|ol|br|hr|pre|blockquote|table|tr|td|th|section|article|details|summary)\b[^>]*>/gi;

/**
 * Release-note HTML that is safe to render with `v-html`: headings, paragraphs, lists, quotes, code,
 * emphasis and links whose only attribute is an http(s) or mailto `href`. Scripts and styles are
 * dropped with their content, images are dropped, other tags are unwrapped and keep their text.
 */
export function sanitizeReleaseHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: RELEASE_TAGS,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  }).trim();
}

/**
 * Plain text on one line: tags removed with a space between block elements, entities decoded,
 * whitespace collapsed. The content of scripts and styles is dropped.
 */
export function htmlToText(html: string): string {
  const text = sanitizeHtml(html.replace(BLOCK_TAG, " "), { allowedTags: [], allowedAttributes: {} });
  // sanitize-html decodes every entity of its input, then re-escapes these four in its output.
  // `&amp;` goes last, so a literal `&amp;lt;` becomes `&lt;` and not `<`.
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `text` unchanged if it fits in `maxLength` characters. Otherwise cut at the last word boundary,
 * without dangling punctuation, and followed by `…`; the result, ellipsis included, never exceeds
 * `maxLength`. A single word longer than the limit is cut mid-word.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s,;:.\-–—]+$/, "")}…`;
}
