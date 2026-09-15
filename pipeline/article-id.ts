import { createHash } from "node:crypto";

const TRACKING_PARAM = /^(utm_.*|ref)$/;

/**
 * Stable 12-hex-character id for an article URL. Variants of the same URL (tracking parameters,
 * `www.`, trailing slash, fragment, parameter order) get the same id, which is how the same article
 * from two sources collapses into one. The algorithm is fixed by the stage 1 spec: changing it would
 * give every archived article a new id.
 *
 * Throws if `url` is not an absolute URL.
 */
export function articleId(url: string): string {
  const normalized = new URL(url);
  normalized.hostname = normalized.hostname.replace(/^www\./, "");
  normalized.hash = "";
  // Copy the keys first: deleting while iterating searchParams skips entries.
  for (const key of [...normalized.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) normalized.searchParams.delete(key);
  }
  normalized.searchParams.sort();
  if (normalized.pathname.length > 1) normalized.pathname = normalized.pathname.replace(/\/+$/, "");
  return createHash("sha256").update(normalized.toString()).digest("hex").slice(0, 12);
}
