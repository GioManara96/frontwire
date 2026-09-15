import type { SourceId } from "../utils/sources";
import type { TagId } from "../utils/tags";

/** Top-level archive grouping, independent of `tags`. */
export type Category = "frontend" | "ai";

/**
 * Canonical article record shared by the pipeline and the app.
 *
 * Missing optional fields are omitted, never `null`.
 */
export type Article = {
  /**
   * First 12 hex chars of SHA-256 of the normalized original URL (or `discussionUrl`
   * when an HN item has no outbound link), so duplicates collapse to one record.
   */
  id: string;
  /** For GitHub releases, project name plus tag, e.g. `Nuxt v4.5.2`. */
  title: string;
  /** Absolute URL of the original. For dev.to, `canonical_url`. */
  url: string;
  sourceId: SourceId;
  /** ISO 8601 in UTC (`2026-09-14T12:19:00Z`). */
  publishedAt: string;
  category: Category;
  tags: TagId[];
  /** Plain-text excerpt supplied by the source, at most 300 characters. */
  excerpt?: string;
  /** Sanitized release notes. Only GitHub releases have this field. */
  contentHtml?: string;
  /** HN discussion page. Only Hacker News items have this field. */
  discussionUrl?: string;
  /** Absolute cover image URL when the source provided one. */
  coverImageUrl?: string;
};

/** Article fields the archive needs. Release-note HTML stays on the detail payload. */
export type ArticleListItem = Omit<Article, "contentHtml">;
