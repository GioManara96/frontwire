<script setup lang="ts">
import type { ArticleListItem } from "#shared/types/article";
import type { TagId } from "#shared/utils/tags";

const props = defineProps<{
  article: ArticleListItem;
  /** Tags active in the filter bar, drawn as pressed. */
  activeTags: readonly TagId[];
}>();

// A click on a tag asks the page to switch that tag filter on or off.
const emit = defineEmits<{ tag: [tag: TagId] }>();

const source = computed(() => SOURCES[props.article.sourceId]);
const external = computed(() => opensOriginal(props.article));

// Some sources block hotlinking (cross-origin). A failed cover falls back to the source placeholder.
const coverFailed = ref(false);
</script>

<template>
  <article class="card">
    <img
      v-if="article.coverImageUrl && !coverFailed"
      class="cover cover__image"
      :src="article.coverImageUrl"
      :alt="article.title"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="coverFailed = true"
    />
    <div v-else class="cover cover--placeholder">
      <Icon class="cover__placeholder-icon" :name="source.icon" />
      <span class="cover__placeholder-name">{{ source.name }}</span>
    </div>
    <FavoriteButton class="card__favorite" :article="article" />
    <div class="card__body">
      <div class="meta">
        <span class="meta__source"><Icon :name="source.icon" />{{ source.name }}</span>
        <span class="meta__dot">/</span>
        <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
        <span class="meta__dot">/</span>
        <span class="card__category">{{ article.category }}</span>
      </div>
      <h2 class="card__title">
        <a v-if="external" :href="article.url" target="_blank" rel="noopener"
          >{{ article.title
          }}<Icon
            class="card__external"
            name="material-symbols-light:arrow-outward"
            aria-label="Opens the original in a new tab"
        /></a>
        <NuxtLink v-else :to="`/articles/${article.id}`">{{ article.title }}</NuxtLink>
      </h2>
      <ul class="tag-list">
        <li v-for="tag in article.tags" :key="tag">
          <button
            type="button"
            class="tag tag--button"
            :aria-pressed="activeTags.includes(tag)"
            :title="`Filter by ${TAGS[tag].label}`"
            @click="emit('tag', tag)"
          >
            <Icon class="tag__icon" :name="TAGS[tag].icon" />{{ TAGS[tag].label }}
          </button>
        </li>
      </ul>
      <p v-if="article.excerpt" class="card__excerpt">{{ article.excerpt }}</p>
      <a
        v-if="article.discussionUrl"
        class="card__discussion"
        :href="article.discussionUrl"
        target="_blank"
        rel="noopener"
        ><Icon name="material-symbols-light:forum-outline" />Discussion on {{ source.name }}</a
      >
    </div>
  </article>
</template>
