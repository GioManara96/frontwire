<script setup lang="ts">
import type { ArticleListItem } from "#shared/types/article";

// The whole article, not its id: saving copies it into the browser so it outlives the archive.
const props = defineProps<{ article: ArticleListItem }>();

const { isSaved, toggle } = useFavorites();
const saved = computed(() => isSaved(props.article.id));
const label = computed(() => (saved.value ? "Remove from saved" : "Save this article"));
</script>

<template>
  <button
    type="button"
    class="favorite"
    :aria-pressed="saved"
    :aria-label="label"
    :title="label"
    @click="toggle(article)"
  >
    <Icon :name="saved ? 'material-symbols-light:bookmark' : 'material-symbols-light:bookmark-outline'" />
  </button>
</template>
