import { getArticles, findArticle } from "#server/utils/articles";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") as string;
  const article = findArticle(getArticles(), id);
  if (!article) {
    throw createError({ statusCode: 404 });
  }
  return article;
});
