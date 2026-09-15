import type { Article } from "../shared/types/article";
import type { SourceId } from "../shared/utils/sources";
import { MAX_PER_SOURCE, RETENTION_DAYS } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether an article published at `publishedAt` (ISO 8601) still belongs in the archive at `now`:
 * at most `RETENTION_DAYS` old, the boundary included. Future dates count as inside.
 */
export function isWithinWindow(publishedAt: string, now: Date): boolean {
  return Date.parse(publishedAt) >= now.getTime() - RETENTION_DAYS * DAY_MS;
}

function newestFirst(a: Article, b: Article): number {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id);
}

/**
 * The archive after an import. Stored articles are kept exactly as they are, never refreshed from the
 * feed. An incoming article joins only if its id is new; among incoming articles with the same id the
 * first wins, so callers pass them in registry order. Two limits then apply to stored and incoming
 * articles alike: articles outside the retention window are dropped, and each source keeps only its
 * `MAX_PER_SOURCE` newest articles. The result is sorted newest first, ties by id, so the same data
 * always serializes to the same bytes. The arguments are not modified.
 */
export function mergeArticles(existing: Article[], incoming: Article[], now: Date): Article[] {
  const byId = new Map<string, Article>();
  for (const article of existing) byId.set(article.id, article);
  for (const article of incoming) {
    if (!byId.has(article.id)) byId.set(article.id, article);
  }

  const keptPerSource = new Map<SourceId, number>();
  return [...byId.values()]
    .filter((article) => isWithinWindow(article.publishedAt, now))
    .sort(newestFirst)
    .filter((article) => {
      // Sorted newest first, so the first MAX_PER_SOURCE articles of a source are its newest.
      const kept = (keptPerSource.get(article.sourceId) ?? 0) + 1;
      keptPerSource.set(article.sourceId, kept);
      return kept <= MAX_PER_SOURCE;
    });
}
