<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const { data, error } = await useFetch(`/api/articles/${id}`);

// Fatal so Nuxt shows its error page instead of rendering an empty detail view.
if (error.value || !data.value) {
  throw createError({ statusCode: 404, fatal: true });
}

const article = data.value;
</script>

<template>
  <div>
    <article>
      <img v-if="article.coverImageUrl" :src="article.coverImageUrl" :alt="article.title" />
      <div v-else>{{ SOURCES[article.sourceId].name }}</div>
      <h1>{{ article.title }}</h1>
      <p>{{ SOURCES[article.sourceId].name }}</p>
      <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
      <p>{{ article.category }}</p>
      <ul>
        <li v-for="tag in article.tags" :key="tag">{{ TAGS[tag].label }}</li>
      </ul>
      <p v-if="getArticleText(article)">{{ getArticleText(article) }}</p>
      <!-- eslint-disable-next-line vue/no-v-html -- sanitized release notes; the only HTML we render -->
      <div v-if="article.contentHtml" v-html="article.contentHtml"></div>
      <p><a :href="article.url" target="_blank" rel="noopener">Read the original</a></p>
      <p v-if="article.discussionUrl"><a :href="article.discussionUrl" target="_blank" rel="noopener">Discussion</a></p>
    </article>
    <p><NuxtLink to="/">Back to articles</NuxtLink></p>
  </div>
</template>
