import type { Article } from "../types/article";

/**
 * Body copy for archive and detail: the AI summary when it exists, otherwise the
 * source excerpt. `undefined` means the page should omit the text block (HN links).
 */
export function getArticleText(article: Pick<Article, "summary" | "excerpt">): string | undefined {
  return article.summary ?? article.excerpt;
}
