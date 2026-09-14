import type { SourceId } from "../utils/sources";
import type { TagId } from "../utils/tags";

export type Category = "frontend" | "ai";

export type Article = {
  id: string;
  title: string;
  url: string;
  sourceId: SourceId;
  publishedAt: string;
  category: Category;
  tags: TagId[];
  excerpt?: string;
  summary?: string;
  contentHtml?: string;
  discussionUrl?: string;
  coverImageUrl?: string;
};

export type ArticleListItem = Omit<Article, "contentHtml">;
