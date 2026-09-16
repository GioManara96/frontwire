<script setup lang="ts">
import type { TagId } from "#shared/utils/tags";

const { favorites, count, clear } = useFavorites();

// Removing everything in one click deserves a second one: unlike a single bookmark, it can't be undone
// for the articles the archive has already dropped.
const confirming = ref(false);

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
      <div v-if="count" class="saved__actions">
        <button v-if="!confirming" type="button" class="button button--ghost" @click="confirming = true">
          Remove all
        </button>
        <template v-else>
          <button type="button" class="button button--primary" @click="(clear(), (confirming = false))">
            Remove all {{ count }}?
          </button>
          <button type="button" class="button button--ghost" @click="confirming = false">Keep them</button>
        </template>
      </div>
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
