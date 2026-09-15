<script setup lang="ts">
const { data: articles } = await useFetch("/api/articles");
</script>

<template>
  <div>
    <h1>Articles</h1>
    <p v-if="!articles?.length">No articles yet.</p>
    <ul v-else>
      <li v-for="article in articles" :key="article.id">
        <article>
          <img v-if="article.coverImageUrl" :src="article.coverImageUrl" :alt="article.title" />
          <div v-else>{{ SOURCES[article.sourceId].name }}</div>
          <h2>
            <NuxtLink :to="`/articles/${article.id}`">{{ article.title }}</NuxtLink>
          </h2>
          <p>{{ SOURCES[article.sourceId].name }}</p>
          <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
          <p>{{ article.category }}</p>
          <ul>
            <li v-for="tag in article.tags" :key="tag">{{ TAGS[tag].label }}</li>
          </ul>
          <p v-if="getArticleText(article)">{{ getArticleText(article) }}</p>
        </article>
      </li>
    </ul>
  </div>
</template>
