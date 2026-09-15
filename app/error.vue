<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

// 404 gets a tailored line; everything else falls back to a generic message.
const isNotFound = props.error.statusCode === 404;
</script>

<template>
  <div>
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="site-header__brand">front<span class="site-header__brand-accent">wire</span></NuxtLink>
      </div>
    </header>
    <main class="page">
      <div class="error">
        <p class="error__code">Error {{ error.statusCode }}</p>
        <h1 class="error__title">{{ isNotFound ? "Article not found" : "Something went wrong" }}</h1>
        <p class="error__message">
          {{ isNotFound ? "This article is not in the archive." : "An unexpected error occurred." }}
        </p>
        <NuxtLink to="/" class="button button--ghost" @click="clearError({ redirect: '/' })">Back to articles</NuxtLink>
      </div>
    </main>
  </div>
</template>
