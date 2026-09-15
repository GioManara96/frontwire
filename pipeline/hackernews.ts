import type { Article } from "../shared/types/article";
import { SOURCES } from "../shared/utils/sources";
import { articleId } from "./article-id";
import { topicOf } from "./assign-tags";
import { HN_MIN_POINTS, RETENTION_DAYS } from "./config";
import { isWithinWindow } from "./merge";
import { absoluteHttpUrl, toIsoDate, type NormalizeResult } from "./normalize";

const SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date";
const DISCUSSION_URL = "https://news.ycombinator.com/item?id=";

// The fields read from an Algolia hit. Algolia sends `null` for missing values (`url` of an Ask HN).
type Hit = {
  objectID?: string;
  title?: string | null;
  url?: string | null;
  points?: number | null;
  created_at?: string | null;
};

/**
 * Algolia search URL for the Hacker News stories posted in the retention window before `now` with at
 * least `HN_MIN_POINTS`, newest first, in one page of up to 1000 results.
 */
export function hackerNewsUrl(now: Date): string {
  const since = Math.floor(now.getTime() / 1000) - RETENTION_DAYS * 24 * 60 * 60;
  const params = new URLSearchParams({
    tags: "story",
    numericFilters: `created_at_i>=${since},points>=${HN_MIN_POINTS}`,
    hitsPerPage: "1000",
  });
  return `${SEARCH_URL}?${params}`;
}

/**
 * Articles from the body of a `hackerNewsUrl` search. Tags and category come from the title; the URL is
 * the story's link or, for stories without an absolute one (Ask HN), the discussion page, which is also
 * `discussionUrl`. No excerpt and no cover. Stories without a title, a vocabulary keyword in it,
 * `HN_MIN_POINTS` or a date in the retention window are counted in `skipped`, whatever the request asked
 * for. Relevance of AI stories is left to the pipeline, as for every source.
 *
 * Throws if `json` is not JSON or has no `hits` array.
 */
export function normalizeHackerNews(json: string, now: Date): NormalizeResult {
  const body: unknown = JSON.parse(json);
  const hits = typeof body === "object" && body !== null && "hits" in body ? body.hits : undefined;
  if (!Array.isArray(hits)) throw new Error("Expected an Algolia search result with hits");

  const articles: Article[] = [];
  let skipped = 0;
  for (const hit of hits as Hit[]) {
    const title = hit.title?.trim();
    const topic = title ? topicOf(title, SOURCES.hackernews) : undefined;
    const publishedAt = toIsoDate(hit.created_at ?? undefined);
    const enoughPoints = (hit.points ?? 0) >= HN_MIN_POINTS;
    if (!title || !topic || !hit.objectID || !enoughPoints || !publishedAt || !isWithinWindow(publishedAt, now)) {
      skipped++;
      continue;
    }
    const discussionUrl = `${DISCUSSION_URL}${hit.objectID}`;
    const url = absoluteHttpUrl(hit.url ?? undefined) ?? discussionUrl;
    articles.push({ id: articleId(url), title, url, sourceId: "hackernews", publishedAt, ...topic, discussionUrl });
  }
  return { articles, skipped };
}
