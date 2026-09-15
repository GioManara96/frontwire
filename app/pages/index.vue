<script setup lang="ts">
const { data: articles } = await useFetch("/api/articles");
const { builtAt } = useRuntimeConfig().public;

// Some sources block hotlinking (cross-origin). A failed cover falls back to the source placeholder.
const coverFailed = ref<Record<string, boolean>>({});
</script>

<template>
  <div>
    <header class="archive__intro">
      <h1 class="archive__title">Web development and AI news for developers</h1>
      <p class="archive__updated">
        Updated <time :datetime="builtAt">{{ formatDate(builtAt) }}</time>
      </p>
    </header>
    <p v-if="!articles?.length" class="archive__empty">No articles yet.</p>
    <ul v-else class="archive__grid">
      <li v-for="article in articles" :key="article.id">
        <article class="card">
          <img
            v-if="article.coverImageUrl && !coverFailed[article.id]"
            class="cover cover__image"
            :src="article.coverImageUrl"
            :alt="article.title"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="coverFailed[article.id] = true"
          />
          <div v-else class="cover cover--placeholder">
            <Icon class="cover__placeholder-icon" :name="SOURCES[article.sourceId].icon" />
            <span class="cover__placeholder-name">{{ SOURCES[article.sourceId].name }}</span>
          </div>
          <div class="card__body">
            <div class="meta">
              <span class="meta__source"
                ><Icon :name="SOURCES[article.sourceId].icon" />{{ SOURCES[article.sourceId].name }}</span
              >
              <span class="meta__dot">/</span>
              <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
              <span class="meta__dot">/</span>
              <span class="card__category">{{ article.category }}</span>
            </div>
            <h2 class="card__title">
              <NuxtLink :to="`/articles/${article.id}`">{{ article.title }}</NuxtLink>
            </h2>
            <ul class="tag-list">
              <li v-for="tag in article.tags" :key="tag" class="tag">
                <Icon class="tag__icon" :name="TAGS[tag].icon" :aria-label="TAGS[tag].label" />{{ TAGS[tag].label }}
              </li>
            </ul>
            <p v-if="article.excerpt" class="card__excerpt">{{ article.excerpt }}</p>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>
