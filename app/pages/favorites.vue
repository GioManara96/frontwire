<script setup lang="ts">
import type { TagId } from "#shared/utils/tags";

const { favorites, count } = useFavorites();

// Tags here lead to the archive filtered on that tag: this page has no filters of its own.
function showTag(tag: TagId) {
  return navigateTo({ path: "/", query: { tags: tag } });
}
</script>

<template>
  <div>
    <header class="archive__intro">
      <h1 class="archive__title">Saved articles</h1>
      <p v-if="count" class="archive__updated">{{ count }} {{ count === 1 ? "article" : "articles" }}</p>
    </header>
    <div v-if="!count" class="archive__empty">
      <p>Nothing saved yet.</p>
      <NuxtLink to="/" class="button button--ghost">Back to articles</NuxtLink>
    </div>
    <ul v-else class="archive__grid">
      <li v-for="article in favorites" :key="article.id">
        <ArticleCard :article="article" :active-tags="[]" @tag="showTag" />
      </li>
    </ul>
  </div>
</template>
