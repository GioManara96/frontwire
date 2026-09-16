<script setup lang="ts">
const { data: articles } = await useFetch("/api/articles");
const { builtAt } = useRuntimeConfig().public;
const { filters, setCategory, toggleTag, clear } = useArticleFilters();

// Counts cover the whole archive, not the filtered list, so a tag's number doesn't change under the finger.
const tagCounts = computed(() => countTags(articles.value ?? []));
const visible = computed(() => filterArticles(articles.value ?? [], filters.value));

// Nuxt keeps the scroll position when only the query changes. Filtering from far down the page would then
// leave the reader below a shorter list, so bring them back to where the filter bar starts.
const intro = useTemplateRef("intro");
watch(filters, () => {
  if (!intro.value) return;
  const resultsTop = intro.value.offsetTop + intro.value.offsetHeight;
  if (window.scrollY > resultsTop) window.scrollTo({ top: resultsTop });
});
</script>

<template>
  <div>
    <header ref="intro" class="archive__intro">
      <h1 class="archive__title">Web development and AI news for developers</h1>
      <p class="archive__updated">
        Updated <time :datetime="builtAt">{{ formatDate(builtAt) }}</time>
      </p>
    </header>
    <p v-if="!articles?.length" class="archive__empty">No articles yet.</p>
    <div v-else class="archive__layout">
      <FilterBar :filters="filters" :tag-counts="tagCounts" @category="setCategory" @tag="toggleTag" @clear="clear" />
      <div>
        <div v-if="!visible.length" class="archive__empty">
          <p>No articles match these filters.</p>
          <button type="button" class="button button--ghost" @click="clear">Clear filters</button>
        </div>
        <ul v-else class="archive__grid">
          <li v-for="article in visible" :key="article.id">
            <ArticleCard :article="article" :active-tags="filters.tags" @tag="toggleTag" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
