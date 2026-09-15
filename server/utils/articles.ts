import articles from "../../data/articles.json";
import type { Article, ArticleListItem } from "../../shared/types/article";

export function getArticles(): Article[] {
  return articles as Article[];
}

export function listArticles(articles: Article[]): ArticleListItem[] {
  const items = articles.map(({ contentHtml, ...rest }) => rest);
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return items;
}

export function findArticle(articles: Article[], id: string): Article | undefined {
  return articles.find((article) => article.id === id);
}
