import type { ArticleListItem } from "#shared/types/article";
import {
  addFavorite,
  isFavorite,
  parseFavorites,
  removeFavorite,
  serializeFavorites,
  toSaved,
  type SavedArticle,
} from "~/utils/favorites";

const STORAGE_KEY = "frontwire.favorites";

/**
 * The articles saved in this browser, newest save first, shared by every component that asks for them.
 *
 * The list stays empty until the calling component is mounted: the prerendered pages are the ones of a
 * reader with nothing saved, and reading storage during hydration would make the client HTML differ from
 * the server's. Saving and removing write through to storage right away.
 *
 * A browser that refuses storage (private mode, blocked site data) keeps the list for the session only.
 */
export function useFavorites() {
  const favorites = useState<SavedArticle[]>("favorites", () => []);
  const loaded = useState("favorites-loaded", () => false);

  onMounted(() => {
    if (loaded.value) return;
    loaded.value = true;
    try {
      favorites.value = parseFavorites(localStorage.getItem(STORAGE_KEY));
    } catch {
      favorites.value = [];
    }
  });

  function write(list: SavedArticle[]) {
    favorites.value = list;
    try {
      localStorage.setItem(STORAGE_KEY, serializeFavorites(list));
    } catch {
      // Nothing to do: the reader keeps the list until they leave the site.
    }
  }

  return {
    favorites,
    count: computed(() => favorites.value.length),
    /** Whether the article `id` is saved. Reactive: reading it in a template follows the list. */
    isSaved: (id: string) => isFavorite(favorites.value, id),
    /** Forgets every saved article. */
    clear: () => write([]),
    /** Saves `article` as it is now, or removes it when it is already saved. */
    toggle: (article: ArticleListItem) =>
      write(
        isFavorite(favorites.value, article.id)
          ? removeFavorite(favorites.value, article.id)
          : addFavorite(favorites.value, toSaved(article, new Date().toISOString())),
      ),
  };
}
