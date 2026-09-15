import type { Category } from "#shared/types/article";
import type { TagId } from "#shared/utils/tags";
import { filtersToQuery, parseFilters, toggleTag, type ArticleFilters } from "~/utils/article-filters";

const NO_FILTERS: ArticleFilters = { category: undefined, tags: [] };

/**
 * The archive filters, kept in the home page query (`?category=ai&tags=react,vue`).
 *
 * `filters` stays empty until the calling component is mounted: the prerendered page has no query, and
 * filtering during hydration would make the client HTML differ from the server's. The actions navigate,
 * so every change is a history entry and Back returns to the previous filters.
 */
export function useArticleFilters() {
  const route = useRoute();
  const mounted = ref(false);
  onMounted(() => {
    mounted.value = true;
  });

  const filters = computed<ArticleFilters>(() => (mounted.value ? parseFilters(route.query) : NO_FILTERS));

  function apply(next: ArticleFilters) {
    return navigateTo({ path: "/", query: filtersToQuery(next) });
  }

  return {
    filters,
    /** Shows one category, or both with `undefined`; the tags are kept. */
    setCategory: (category: Category | undefined) => apply({ ...filters.value, category }),
    /** Switches `tag` on or off; the category is kept. */
    toggleTag: (tag: TagId) => apply(toggleTag(filters.value, tag)),
    clear: () => apply(NO_FILTERS),
  };
}
