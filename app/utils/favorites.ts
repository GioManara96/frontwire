// Saved articles, kept in the browser. Relative imports, no Nuxt auto-imports, so Vitest loads it outside Nuxt.
import type { ArticleListItem } from "../../shared/types/article";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";
import { CATEGORIES } from "./article-filters";

/**
 * An article as it was when the reader saved it, plus `savedAt` (ISO 8601 in UTC).
 *
 * It is a copy, not a reference: the saved article survives the archive dropping it, and never picks up
 * a later correction from the source.
 */
export type SavedArticle = ArticleListItem & { savedAt: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isMissingOrString(value: unknown): boolean {
  return value === undefined || isString(value);
}

/**
 * Whether a value read back from storage can be drawn as a card.
 *
 * `sourceId` and `tags` are checked against the real vocabularies, not just their type: an unknown key
 * would send the card looking for the icon of a source that does not exist.
 */
function isSavedArticle(value: unknown): value is SavedArticle {
  if (typeof value !== "object" || value === null) return false;
  const article = value as Record<string, unknown>;
  return (
    isString(article.id) &&
    isString(article.title) &&
    isString(article.url) &&
    isString(article.publishedAt) &&
    isString(article.savedAt) &&
    isString(article.sourceId) &&
    Object.hasOwn(SOURCES, article.sourceId) &&
    isString(article.category) &&
    CATEGORIES.includes(article.category) &&
    Array.isArray(article.tags) &&
    article.tags.every((tag) => isString(tag) && Object.hasOwn(TAGS, tag)) &&
    isMissingOrString(article.excerpt) &&
    isMissingOrString(article.discussionUrl) &&
    isMissingOrString(article.coverImageUrl)
  );
}

/** `article` as it will be stored, saved at `savedAt` (ISO 8601 in UTC). */
export function toSaved(article: ArticleListItem, savedAt: string): SavedArticle {
  return { ...article, savedAt };
}

/**
 * The saved articles held in `raw`, newest save first; `null` is the reader who never saved anything.
 *
 * Storage is edited by hand from the browser tools and outlives any release, so nothing in it is trusted:
 * entries that could not be drawn are dropped and the rest are kept. A value that is not a JSON array at
 * all gives an empty list, the only way out of a state nothing could read.
 */
export function parseFavorites(raw: string | null): SavedArticle[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(parsed) ? parsed.filter(isSavedArticle) : [];
}

/** The string to store for `list`, the inverse of `parseFavorites`. */
export function serializeFavorites(list: readonly SavedArticle[]): string {
  return JSON.stringify(list);
}

/** `list` with `saved` first, or `list` unchanged when that article is already there. */
export function addFavorite(list: readonly SavedArticle[], saved: SavedArticle): SavedArticle[] {
  return isFavorite(list, saved.id) ? [...list] : [saved, ...list];
}

/** `list` without the article `id`, the others in their order. */
export function removeFavorite(list: readonly SavedArticle[], id: string): SavedArticle[] {
  return list.filter((article) => article.id !== id);
}

/** Whether the article `id` is saved. */
export function isFavorite(list: readonly SavedArticle[], id: string): boolean {
  return list.some((article) => article.id === id);
}
