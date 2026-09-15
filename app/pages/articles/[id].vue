<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const { data, error } = await useFetch(`/api/articles/${id}`);

// Fatal so Nuxt shows its error page instead of rendering an empty detail view.
if (error.value || !data.value) {
  throw createError({ statusCode: 404, fatal: true });
}

const article = data.value;

// Some sources block hotlinking (cross-origin); hide a broken cover instead of showing a broken image.
const coverFailed = ref(false);
</script>

<template>
  <article class="detail">
    <img
      v-if="article.coverImageUrl && !coverFailed"
      class="detail__cover cover__image"
      :src="article.coverImageUrl"
      :alt="article.title"
      referrerpolicy="no-referrer"
      @error="coverFailed = true"
    />
    <div class="meta">
      <span class="meta__source"
        ><Icon :name="SOURCES[article.sourceId].icon" />{{ SOURCES[article.sourceId].name }}</span
      >
      <span class="meta__dot">/</span>
      <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
      <span class="meta__dot">/</span>
      <span class="card__category">{{ article.category }}</span>
    </div>
    <h1 class="detail__title">{{ article.title }}</h1>
    <p class="detail__credit">
      Originally published on
      <a :href="article.url" target="_blank" rel="noopener">{{ SOURCES[article.sourceId].name }}</a
      >. Frontwire only shows a summary — read the full piece at the source.
    </p>
    <ul class="tag-list">
      <li v-for="tag in article.tags" :key="tag" class="tag">
        <Icon class="tag__icon" :name="TAGS[tag].icon" :aria-label="TAGS[tag].label" />{{ TAGS[tag].label }}
      </li>
    </ul>
    <p v-if="getArticleText(article)" class="detail__text">{{ getArticleText(article) }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -- sanitized release notes; the only HTML we render -->
    <div v-if="article.contentHtml" class="prose" v-html="article.contentHtml"></div>
    <div class="detail__actions">
      <a class="button button--primary" :href="article.url" target="_blank" rel="noopener">Read the original</a>
      <a
        v-if="article.discussionUrl"
        class="button button--ghost"
        :href="article.discussionUrl"
        target="_blank"
        rel="noopener"
        >Discussion</a
      >
    </div>
    <p><NuxtLink to="/" class="detail__back">Back to articles</NuxtLink></p>
  </article>
</template>
