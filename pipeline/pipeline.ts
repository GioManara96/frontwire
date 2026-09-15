import type { Article } from "../shared/types/article";
import { SOURCES, type FeedSourceId, type SourceId } from "../shared/utils/sources";
import { hackerNewsUrl, normalizeHackerNews } from "./hackernews";
import { mergeArticles } from "./merge";
import { normalizeFeed, type NormalizeResult } from "./normalize";
import { isDeveloperRelevant } from "./relevance";

export type PipelineDeps = {
  /** The archive as currently stored. */
  existing: Article[];
  now: Date;
  /** Body of the response at a URL, or a rejection; injected so tests run without network. */
  fetchText: (url: string) => Promise<string>;
};

export type PipelineResult = {
  /** The new archive, ready to be written. */
  articles: Article[];
  /** Ids in the new archive that were not in `existing`. */
  added: number;
  /** Ids of `existing` that left the archive: expired, or pushed out by newer articles of the same source. */
  removed: number;
  /** Source items the run dropped, normalization and relevance filter together. */
  skipped: number;
  /** One `"<sourceId>: <reason>"` line per source that failed. */
  warnings: string[];
};

const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];

function isFeedSource(id: SourceId): id is FeedSourceId {
  return "feedUrl" in SOURCES[id];
}

// Parsing inside `.then` turns an unreadable response into a rejection, handled like a network failure.
function importSource(id: SourceId, now: Date, fetchText: PipelineDeps["fetchText"]): Promise<NormalizeResult> {
  if (isFeedSource(id)) return fetchText(SOURCES[id].feedUrl).then((xml) => normalizeFeed(xml, id, now));
  return fetchText(hackerNewsUrl(now)).then((json) => normalizeHackerNews(json, now));
}

/**
 * One import run: fetches every source in parallel, normalizes what comes back, drops the AI articles
 * that do not matter to a web developer and merges the rest into `existing`. A failing source (network,
 * HTTP status, unreadable response) only produces a warning; if every source fails the run throws,
 * because writing the archive back would hide that it went stale.
 */
export async function runPipeline({ existing, now, fetchText }: PipelineDeps): Promise<PipelineResult> {
  const results = await Promise.allSettled(SOURCE_IDS.map((id) => importSource(id, now, fetchText)));

  // allSettled keeps request order, so `incoming` is in registry order: that gives the first source priority on duplicates.
  const warnings: string[] = [];
  const incoming: Article[] = [];
  let skipped = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      incoming.push(...result.value.articles);
      skipped += result.value.skipped;
    } else {
      warnings.push(`${SOURCE_IDS[index]}: ${errorMessage(result.reason)}`);
    }
  });
  if (warnings.length === SOURCE_IDS.length) throw new Error(`Every source failed. ${warnings.join("; ")}`);

  // Frontend sources are on topic by definition; AI articles have to earn their place (stage 4 spec).
  const relevant = incoming.filter((article) => article.category !== "ai" || isDeveloperRelevant(article.title));
  skipped += incoming.length - relevant.length;

  const articles = mergeArticles(existing, relevant, now);
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
