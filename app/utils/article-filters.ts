// Pure filter logic for the archive. Relative imports, no Nuxt auto-imports, so Vitest loads it outside Nuxt.
import type { ArticleListItem, Category } from "../../shared/types/article";
import { TAGS, type TagId } from "../../shared/utils/tags";

/**
 * What the archive shows: articles of `category` (both when `undefined`) that have at least one of
 * `tags` (any article when empty). `tags` is always in vocabulary order, without duplicates.
 */
export type ArticleFilters = { category: Category | undefined; tags: TagId[] };

/** A value of a router query: repeated keys give arrays, a key without `=` gives `null`. */
type QueryValue = string | null | (string | null)[] | undefined;

/** The category vocabulary, for checking values that come from outside the app (a query, the browser storage). */
export const CATEGORIES: readonly string[] = ["frontend", "ai"] satisfies Category[];
const TAG_ORDER = Object.keys(TAGS) as TagId[];

function isTagId(value: string): value is TagId {
  return Object.hasOwn(TAGS, value);
}

function inVocabularyOrder(tags: Iterable<TagId>): TagId[] {
  const wanted = new Set(tags);
  return TAG_ORDER.filter((tag) => wanted.has(tag));
}

/**
 * Filters from the home page query (`?category=ai&tags=react,vue`). Unknown categories and tags are
 * ignored, so a stale or hand-edited URL still shows something; for a repeated `category` the first wins.
 */
export function parseFilters(query: Record<string, QueryValue>): ArticleFilters {
  const category = [query.category].flat()[0];
  const tags = [query.tags].flat().flatMap((value) => (value ? value.split(",") : []));
  return {
    category: category && CATEGORIES.includes(category) ? (category as Category) : undefined,
    tags: inVocabularyOrder(tags.filter(isTagId)),
  };
}

/** The query for `filters`, the inverse of `parseFilters`: unset filters leave their key out, so no filter is `{}`. */
export function filtersToQuery({ category, tags }: ArticleFilters): Record<string, string> {
  return {
    ...(category ? { category } : {}),
    ...(tags.length > 0 ? { tags: inVocabularyOrder(tags).join(",") } : {}),
  };
}

/** The articles `filters` let through, in their original order. */
export function filterArticles<T extends ArticleListItem>(articles: readonly T[], filters: ArticleFilters): T[] {
  return articles.filter(
    (article) =>
      (!filters.category || article.category === filters.category) &&
      (filters.tags.length === 0 || article.tags.some((tag) => filters.tags.includes(tag))),
  );
}

/** How many of `articles` have each tag, most frequent first, ties in vocabulary order. Tags with no article are left out. */
export function countTags(articles: readonly ArticleListItem[]): Array<{ tag: TagId; count: number }> {
  const counts = new Map<TagId, number>();
  for (const article of articles) {
    for (const tag of article.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return TAG_ORDER.filter((tag) => counts.has(tag))
    .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** `filters` with `tag` switched on or off; the category is kept. */
export function toggleTag(filters: ArticleFilters, tag: TagId): ArticleFilters {
  const tags = filters.tags.includes(tag) ? filters.tags.filter((active) => active !== tag) : [...filters.tags, tag];
  return { category: filters.category, tags: inVocabularyOrder(tags) };
}

/** Whether a card should open the original instead of the detail page: without an excerpt the detail would be empty. */
export function opensOriginal(article: Pick<ArticleListItem, "excerpt">): boolean {
  return !article.excerpt;
}
