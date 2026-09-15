import { parseFeed } from "feedsmith";
import type { Article } from "../shared/types/article";
import { SOURCES, type FeedSourceId } from "../shared/utils/sources";
import { articleId } from "./article-id";
import { assignTags, topicOf } from "./assign-tags";
import { EXCERPT_LENGTH } from "./config";
import { htmlToText, sanitizeReleaseHtml, truncateText } from "./html";
import { isWithinWindow } from "./merge";

/** `skipped` counts the source items dropped for any reason (see `normalizeFeed` and `normalizeHackerNews`). */
export type NormalizeResult = { articles: Article[]; skipped: number };

// Plain versions only (`v4.5.2`, `19.3`): drops canary, beta and rc builds and stray tags like `create-vite@9.2.1`.
const STABLE_TAG = /^v?\d+\.\d+(\.\d+)?$/;

// The subset of a feedsmith RSS item that can carry a cover image.
type CoverSource = {
  media?: {
    contents?: Array<{ url?: string; medium?: string; type?: string }>;
    thumbnails?: Array<{ url?: string }>;
  };
  enclosures?: Array<{ url?: string; type?: string }>;
};

// A blog post as the blog branch reads it, whichever feed format it came from.
type BlogItem = {
  title: string | undefined;
  link: string | undefined;
  date: string | undefined;
  // Description or summary first, full content as the fallback.
  html: string | undefined;
  categories: string[];
  cover: string | undefined;
};

/** `value` as an ISO 8601 UTC string, or `undefined` if it is missing or not a date. */
export function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** `value` if it is an absolute http(s) URL, `undefined` otherwise (relative, other schemes, garbage). */
export function absoluteHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function makeExcerpt(html: string | undefined, title: string): string | undefined {
  const text = htmlToText(html ?? "");
  if (!text || text === title) return undefined;
  return truncateText(text, EXCERPT_LENGTH);
}

// First usable image, in order of preference: media:content, media:thumbnail, image enclosure.
function coverImage(item: CoverSource): string | undefined {
  const candidates = [
    ...(item.media?.contents ?? [])
      .filter((content) => content.medium === "image" || content.type?.startsWith("image/"))
      .map((content) => content.url),
    ...(item.media?.thumbnails ?? []).map((thumbnail) => thumbnail.url),
    ...(item.enclosures ?? [])
      .filter((enclosure) => enclosure.type?.startsWith("image/"))
      .map((enclosure) => enclosure.url),
  ];
  return candidates.map(absoluteHttpUrl).find((url) => url !== undefined);
}

// The page of an Atom entry: its `alternate` link, which is also what a link without `rel` means.
function alternateLink(entry: { links?: Array<{ href?: string; rel?: string }> }): string | undefined {
  return entry.links?.find((link) => !link.rel || link.rel === "alternate")?.href;
}

function blogItems(parsed: ReturnType<typeof parseFeed>): BlogItem[] {
  if (parsed.format === "rss") {
    return (parsed.feed.items ?? []).map((item) => ({
      title: item.title,
      link: item.link,
      date: item.pubDate ?? item.dc?.date,
      html: item.description ?? item.content?.encoded,
      categories: (item.categories ?? []).map((category) => category.name ?? ""),
      cover: coverImage(item),
    }));
  }
  if (parsed.format === "atom") {
    return (parsed.feed.entries ?? []).map((entry) => ({
      title: entry.title,
      link: alternateLink(entry),
      date: entry.published ?? entry.updated,
      html: entry.summary ?? entry.content,
      categories: (entry.categories ?? []).map((category) => category.term ?? ""),
      cover: undefined,
    }));
  }
  throw new Error(`Expected an RSS or Atom feed, got ${parsed.format}`);
}

function releaseTag(url: string): string | undefined {
  const match = /\/releases\/tag\/([^/]+)$/.exec(new URL(url).pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Articles from one source's feed, following the normalization rules of the stage 3 and 4 specs:
 * category and tags come from the registry or, for title-only sources, from the title; release titles
 * get the project prefix; excerpts are plain text, unless the source turns them off; release notes are
 * sanitized. Items outside the retention window, unstable releases, items without one of the source's
 * `feedCategories`, items of a title-only source whose title has no vocabulary keyword, and items
 * without an absolute link, a title or a valid date are left out and counted in `skipped`.
 *
 * Throws if `xml` is not a feed, or not a format the source's kind reads (RSS or Atom for `blog`, Atom
 * for `github-release`).
 */
export function normalizeFeed(xml: string, sourceId: FeedSourceId, now: Date): NormalizeResult {
  const source = SOURCES[sourceId];
  const parsed = parseFeed(xml);
  const articles: Article[] = [];
  let skipped = 0;

  if (source.kind === "blog") {
    const accepted: readonly string[] | undefined = "feedCategories" in source ? source.feedCategories : undefined;
    const withExcerpt = !("excerpt" in source && source.excerpt === false);
    for (const item of blogItems(parsed)) {
      const title = item.title?.trim();
      const url = absoluteHttpUrl(item.link);
      const publishedAt = toIsoDate(item.date);
      // A source with feedCategories keeps only items tagged with one of them; uncategorized items don't qualify.
      const wanted = !accepted || item.categories.some((category) => accepted.includes(category));
      const topic = title ? topicOf(title, source) : undefined;
      if (!title || !url || !publishedAt || !isWithinWindow(publishedAt, now) || !wanted || !topic) {
        skipped++;
        continue;
      }
      const excerpt = withExcerpt ? makeExcerpt(item.html, title) : undefined;
      articles.push({
        id: articleId(url),
        title,
        url,
        sourceId,
        publishedAt,
        ...topic,
        ...(excerpt ? { excerpt } : {}),
        ...(item.cover ? { coverImageUrl: item.cover } : {}),
      });
    }
    return { articles, skipped };
  }

  if (parsed.format !== "atom") throw new Error(`Expected an Atom feed, got ${parsed.format}`);
  for (const entry of parsed.feed.entries ?? []) {
    const url = absoluteHttpUrl(alternateLink(entry));
    const tag = url ? releaseTag(url) : undefined;
    const publishedAt = toIsoDate(entry.published ?? entry.updated);
    if (!url || !tag || !STABLE_TAG.test(tag) || !publishedAt || !isWithinWindow(publishedAt, now)) {
      skipped++;
      continue;
    }
    // Each repo words the feed title its own way (`v4.5.2`, `19.3.0 (September 9, 2026)`); the tag is uniform.
    const title = `${source.project} ${tag}`;
    const contentHtml = entry.content ? sanitizeReleaseHtml(entry.content) : "";
    const excerpt = makeExcerpt(contentHtml, title);
    // No cover: the only media:thumbnail in GitHub's feeds is the publisher's avatar.
    articles.push({
      id: articleId(url),
      title,
      url,
      sourceId,
      publishedAt,
      category: source.category,
      tags: assignTags(title, source.tags),
      ...(excerpt ? { excerpt } : {}),
      ...(contentHtml ? { contentHtml } : {}),
    });
  }
  return { articles, skipped };
}
