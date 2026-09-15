import { parseFeed } from "feedsmith";
import type { Article } from "../shared/types/article";
import { SOURCES, type FeedSourceId } from "../shared/utils/sources";
import { articleId } from "./article-id";
import { assignTags } from "./assign-tags";
import { EXCERPT_LENGTH } from "./config";
import { htmlToText, sanitizeReleaseHtml, truncateText } from "./html";
import { isWithinWindow } from "./merge";

/** `skipped` counts the feed items dropped for any reason (see `normalizeFeed`). */
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

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function absoluteHttpUrl(value: string | undefined): string | undefined {
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

function releaseTag(url: string): string | undefined {
  const match = /\/releases\/tag\/([^/]+)$/.exec(new URL(url).pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Articles from one source's feed, following the normalization rules of the stage 3 spec: category,
 * default tags and release title prefix come from the registry, excerpts are plain text, release notes
 * are sanitized. Items outside the retention window, unstable releases and items without an absolute
 * link, a title or a valid date are left out and counted in `skipped`.
 *
 * Throws if `xml` is not a feed, or not the format the source's kind expects (RSS for `rss`, Atom for
 * `github-release`).
 */
export function normalizeFeed(xml: string, sourceId: FeedSourceId, now: Date): NormalizeResult {
  const source = SOURCES[sourceId];
  const parsed = parseFeed(xml);
  const articles: Article[] = [];
  let skipped = 0;

  if (source.kind === "rss") {
    if (parsed.format !== "rss") throw new Error(`Expected an RSS feed, got ${parsed.format}`);
    for (const item of parsed.feed.items ?? []) {
      const title = item.title?.trim();
      const url = absoluteHttpUrl(item.link);
      const publishedAt = toIsoDate(item.pubDate ?? item.dc?.date);
      if (!title || !url || !publishedAt || !isWithinWindow(publishedAt, now)) {
        skipped++;
        continue;
      }
      const excerpt = makeExcerpt(item.description ?? item.content?.encoded, title);
      const cover = coverImage(item);
      articles.push({
        id: articleId(url),
        title,
        url,
        sourceId,
        publishedAt,
        category: source.category,
        tags: assignTags(title, source.tags),
        ...(excerpt ? { excerpt } : {}),
        ...(cover ? { coverImageUrl: cover } : {}),
      });
    }
    return { articles, skipped };
  }

  if (parsed.format !== "atom") throw new Error(`Expected an Atom feed, got ${parsed.format}`);
  for (const entry of parsed.feed.entries ?? []) {
    const url = absoluteHttpUrl(entry.links?.find((link) => !link.rel || link.rel === "alternate")?.href);
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
