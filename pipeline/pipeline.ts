import type { Article } from "../shared/types/article";
import { SOURCES, type FeedSourceId, type SourceId } from "../shared/utils/sources";
import { mergeArticles } from "./merge";
import { normalizeFeed } from "./normalize";

export type PipelineDeps = {
  /** The archive as currently stored. */
  existing: Article[];
  now: Date;
  /** Body of the feed at a URL, or a rejection; injected so tests run without network. */
  fetchFeed: (url: string) => Promise<string>;
};

export type PipelineResult = {
  /** The new archive, ready to be written. */
  articles: Article[];
  /** Ids in the new archive that were not in `existing`. */
  added: number;
  /** Ids of `existing` that left the archive: expired, or pushed out by newer articles of the same source. */
  removed: number;
  /** Feed items normalization dropped, summed over all sources. */
  skipped: number;
  /** One `"<sourceId>: <reason>"` line per source that failed. */
  warnings: string[];
};

function isFeedSource(id: SourceId): id is FeedSourceId {
  return "feedUrl" in SOURCES[id];
}

const FEED_SOURCE_IDS = (Object.keys(SOURCES) as SourceId[]).filter(isFeedSource);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * One import run: fetches every feed source in parallel, normalizes the feeds and merges the result
 * into `existing`. A failing source (network, HTTP status, unreadable feed) only produces a warning;
 * if every source fails the run throws, because writing the archive back would hide that it went stale.
 */
export async function runPipeline({ existing, now, fetchFeed }: PipelineDeps): Promise<PipelineResult> {
  // Parsing inside `.then` turns a broken feed into a rejection, handled like a network failure.
  const results = await Promise.allSettled(
    FEED_SOURCE_IDS.map((id) => fetchFeed(SOURCES[id].feedUrl).then((xml) => normalizeFeed(xml, id, now))),
  );

  // allSettled keeps request order, so `incoming` is in registry order: that gives the first source priority on duplicates.
  const warnings: string[] = [];
  const incoming: Article[] = [];
  let skipped = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      incoming.push(...result.value.articles);
      skipped += result.value.skipped;
    } else {
      warnings.push(`${FEED_SOURCE_IDS[index]}: ${errorMessage(result.reason)}`);
    }
  });
  if (warnings.length === FEED_SOURCE_IDS.length) throw new Error(`Every source failed. ${warnings.join("; ")}`);

  const articles = mergeArticles(existing, incoming, now);
  const before = new Set(existing.map((article) => article.id));
  const after = new Set(articles.map((article) => article.id));
  return {
    articles,
    added: articles.filter((article) => !before.has(article.id)).length,
    removed: existing.filter((article) => !after.has(article.id)).length,
    skipped,
    warnings,
  };
}
