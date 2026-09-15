<script setup lang="ts">
import type { Category } from "#shared/types/article";
import type { TagId } from "#shared/utils/tags";
import type { ArticleFilters } from "~/utils/article-filters";

const props = defineProps<{
  filters: ArticleFilters;
  /** Tags to offer, with how many archive articles have each; see `countTags`. */
  tagCounts: Array<{ tag: TagId; count: number }>;
}>();

const emit = defineEmits<{
  category: [category: Category | undefined];
  tag: [tag: TagId];
  clear: [];
}>();

const CATEGORY_OPTIONS: ReadonlyArray<{ value: Category | undefined; label: string }> = [
  { value: undefined, label: "All" },
  { value: "frontend", label: "Frontend" },
  { value: "ai", label: "AI" },
];

const hasFilters = computed(() => props.filters.category !== undefined || props.filters.tags.length > 0);

// On mobile the tag row scrolls sideways, and the browser leaves a focused tag half cut off at the edge.
// Bring it fully into view; scroll-margin in the CSS keeps it off the edge.
function revealFocused(event: FocusEvent) {
  (event.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
}

function tagLabel(tag: TagId, count: number): string {
  return `${TAGS[tag].label}, ${count} ${count === 1 ? "article" : "articles"}`;
}
</script>

<template>
  <nav class="filter-bar" aria-label="Filters">
    <div class="filter-bar__categories">
      <button
        v-for="option in CATEGORY_OPTIONS"
        :key="option.label"
        type="button"
        class="filter"
        :aria-pressed="filters.category === option.value"
        @click="emit('category', option.value)"
      >
        {{ option.label }}
      </button>
      <button v-if="hasFilters" type="button" class="filter-bar__clear" @click="emit('clear')">Clear</button>
    </div>
    <ul class="filter-bar__tags" @focusin="revealFocused">
      <li v-for="{ tag, count } in tagCounts" :key="tag">
        <button
          type="button"
          class="filter"
          :aria-pressed="filters.tags.includes(tag)"
          :aria-label="tagLabel(tag, count)"
          @click="emit('tag', tag)"
        >
          <Icon class="filter__icon" :name="TAGS[tag].icon" />{{ TAGS[tag].label
          }}<span class="filter__count">{{ count }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
