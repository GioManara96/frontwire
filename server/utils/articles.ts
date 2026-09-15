// Relative path so Vitest can load this module outside Nuxt (no `~~` alias).
import articles from "../../data/articles.json";
import type { Article, ArticleListItem } from "../../shared/types/article";

/**
 * Typed records from `data/articles.json`.
 * The JSON cast lives here and only here; the integrity test is what makes it safe.
 */
export function getArticles(): Article[] {
  return articles as Article[];
}

/**
 * Archive payload: newest first, without release-note HTML.
 * Does not reorder or mutate the array it receives.
 */
export function listArticles(articles: Article[]): ArticleListItem[] {
  const items = articles.map(({ contentHtml, ...rest }) => rest);
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return items;
}

/** Detail lookup. `undefined` tells the handler to respond 404. */
export function findArticle(articles: Article[], id: string): Article | undefined {
  return articles.find((article) => article.id === id);
}
