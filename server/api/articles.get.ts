import { getArticles, listArticles } from "#server/utils/articles";

export default defineEventHandler(() => {
  const articles = listArticles(getArticles());
  return articles;
});
