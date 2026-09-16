# Tappa 7 — Piano di lavoro

> **Chi esegue:** Claude scrive codice, test e documentazione (vedi `CLAUDE.md`). Push, merge in `staging`/`main` e lancio dell'Action solo con il via di Giovanni. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** salvare gli articoli nel browser e rileggerli in `/favorites` anche dopo che sono usciti dall'archivio.

**Architettura:** la logica pura sta in `app/utils/favorites.ts` ed è testata con Vitest; un composable con `useState` tiene una sola lista condivisa e parla con il `localStorage` dopo il montaggio; il pulsante è un componente; la pagina riusa `ArticleCard`.

**Stack:** Nuxt 4, Vue 3, Tailwind v4 con classi semantiche, `@nuxt/icon`, Vitest.

**Specifica:** `docs/megipowers/specs/2026-09-16-tappa-7-preferiti-design.md`

---

## Come si lavora

- Branch `feat/favorites` da `staging`, un commit per task. Il branch porta già il commit della spec e quello delle spunte delle tappe 5 e 6, non ancora pubblicato.
- Test prima del codice per la logica pura; markup e CSS verificati con screenshot a 390px e 1280px (Chrome headless dentro un iframe della larghezza giusta) e il salvataggio provato davvero nel browser via CDP.
- Verifica a ogni task: `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run format:check`.

---

### Task 1 — Logica dei preferiti

**File:** `app/utils/favorites.ts` (nuovo), `test/unit/favorites.test.ts` (nuovo).

Interfaccia, sul modello di `article-filters.ts` (import relativi, niente auto-import):

- `type SavedArticle = ArticleListItem & { savedAt: string }`
- `toSaved(article: ArticleListItem, savedAt: string): SavedArticle`
- `parseFavorites(raw: string | null): SavedArticle[]` — JSON illeggibile, non-array o voce non valida ⇒ scarto silenzioso
- `serializeFavorites(list: readonly SavedArticle[]): string`
- `addFavorite(list, saved): SavedArticle[]` — in testa, senza duplicati e senza spostare un id già presente
- `removeFavorite(list, id): SavedArticle[]`
- `isFavorite(list, id): boolean`

- [x] Test: i casi elencati nella spec (voce valida che si rilegge identica, campi opzionali assenti, `sourceId` e tag fuori vocabolario, campi mancanti o di tipo sbagliato, JSON illeggibile, JSON non-array, ordine, doppioni, rimozione).
- [x] Implementazione: la validazione controlla `sourceId` contro `SOURCES` e ogni tag contro `TAGS`.
- [x] Commit: `feat(favorites): add the saved articles logic`

### Task 2 — Stato condiviso

**File:** `app/composables/useFavorites.ts` (nuovo).

- [x] `useFavorites()` con `useState<SavedArticle[]>("favorites")`: legge il `localStorage` in `onMounted` (chiave `frontwire.favorites`), riscrive a ogni cambio, espone `favorites`, `count`, `isSaved(id)`, `toggle(article)`. Commento d'interfaccia sul perché la lista resta vuota fino al montaggio, come in `useArticleFilters`.
- [x] Commit: `feat(favorites): keep the saved articles in one shared list`

### Task 3 — Pulsante nella card e nel dettaglio

**File:** `app/components/FavoriteButton.vue` (nuovo), `app/components/ArticleCard.vue`, `app/pages/articles/[id].vue`, `app/assets/css/main.css`.

- [ ] `FavoriteButton` con prop `article: ArticleListItem`: icona piena o vuota, `aria-pressed`, etichetta "Save this article" / "Remove from saved".
- [ ] Nella card sta sopra la copertina, in alto a destra, sopra il link allargato (stesso `relative z-10` di `.tag--button`); nel dettaglio accanto al titolo.
- [ ] Commit: `feat(favorites): let a card or the detail page save an article`

### Task 4 — Pagina e header

**File:** `app/pages/favorites.vue` (nuovo), `app/app.vue`, `app/assets/css/main.css`.

- [ ] Pagina: titolo "Saved articles", conteggio, griglia di `ArticleCard` senza tag attivi, tag che portano a `/?tags=<tag>`, stato vuoto con link all'archivio.
- [ ] Header: link segnalibro accanto a GitHub, col numero solo dopo il montaggio e solo se maggiore di zero.
- [ ] Commit: `feat(favorites): add the saved articles page`

### Task 5 — Verifica

- [ ] `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run format:check`.
- [ ] `npm run generate`: `/favorites` prerenderizzata, nessun errore di build.
- [ ] Prova nel browser (CDP): salvo dalla card, il numero nell'header sale, la pagina mostra la card, ricarico e resta, tolgo il segnalibro e sparisce; nessun avviso di hydration in console.
- [ ] Screenshot a 390px e 1280px di archivio e pagina preferiti.

### Task 6 — Documentazione

**File:** `CLAUDE.md`.

- [ ] Sezione dei preferiti aggiornata con i file veri e la chiave del `localStorage`.
- [ ] Commit: `docs: update CLAUDE.md after stage 7`

### Task 7 — Rilascio · con il via di Giovanni

- [ ] Merge in `staging` e in `main`, push: il deploy parte da solo. Nel push va anche il commit `docs: tick the stage 5 and 6 checks`, tenuto da parte.
- [ ] Sito vero con i preferiti funzionanti.
