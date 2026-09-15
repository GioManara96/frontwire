# Tappa 5 — Piano di lavoro

> **Chi esegue:** Claude scrive codice, test e documentazione (vedi `CLAUDE.md`). Push, merge in `staging`/`main` e lancio dell'Action solo con il via di Giovanni. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** archivio con intestazione e barra dei filtri (categoria e tag, nell'URL), tag cliccabili, card senza testo che aprono l'originale, dettaglio senza doppioni.

**Architettura:** la logica pura dei filtri sta in `app/utils/article-filters.ts` ed è testata con Vitest; un composable la lega alla route; `FilterBar` e `ArticleCard` sono componenti; le pagine restano leggere.

**Stack:** Nuxt 4, Vue 3, Tailwind v4 con classi semantiche, `@nuxt/icon`, Vitest.

**Specifica:** `docs/megipowers/specs/2026-09-15-tappa-5-filtri-rifiniture-design.md`

---

## Come si lavora

- Branch `feat/filters-and-polish` da `staging` (allineato con `main` a `408f1b9`), un commit per task.
- Test prima del codice per la logica pura; markup e CSS verificati con screenshot a 390px e 1280px (Chrome headless dentro un iframe della larghezza giusta: la finestra headless ha una larghezza minima di circa 500px).
- I task 3 e 4 finiscono in un solo commit: la card emette il clic sul tag e serve il composable della barra per gestirlo.
- Verifica a ogni task: `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run format:check`.

---

### Task 1 — Logica dei filtri

**File:** `app/utils/article-filters.ts`, `test/unit/article-filters.test.ts`.

- [ ] Test: `parseFilters`, `filtersToQuery`, `filterArticles`, `countTags`, `toggleTag`, `opensOriginal` (casi della spec).
- [ ] Implementazione.
- [ ] Commit: `feat(archive): add article filter logic`

### Task 2 — Intestazione

**File:** `nuxt.config.ts`, `app/pages/index.vue`, `app/assets/css/main.css`.

- [ ] `runtimeConfig.public.builtAt` fissato alla build; titolo e "Updated <data>".
- [ ] Commit: `feat(archive): describe the site and show when it was updated`

### Task 3 — Card

**File:** `app/components/ArticleCard.vue`, `app/pages/index.vue`, `app/assets/css/main.css`.

- [ ] Card estratta da `index.vue`; tag come pulsanti con stato attivo (evento verso la pagina); card senza estratto verso l'originale con icona esterna; "Discussion" per HN; tag e link sopra il link allargato.
- [ ] Commit: `feat(archive): link text-less cards to the original and make tags filter`

### Task 4 — Barra dei filtri

**File:** `app/composables/useArticleFilters.ts`, `app/components/FilterBar.vue`, `app/pages/index.vue`, `app/assets/css/main.css`.

- [ ] Composable (filtri dalla route, azioni che navigano, `ready` dopo il montaggio); barra fissa in cima con categoria, tag con conteggio, `Clear`; riga dei tag che scorre su mobile; stato vuoto.
- [ ] Commit: `feat(archive): add the filter bar`

### Task 5 — Dettaglio

**File:** `app/pages/articles/[id].vue`, `app/assets/css/main.css`.

- [ ] Niente estratto con `contentHtml`; avviso sulla fonte per caso; tag come link a `/?tags=<tag>`.
- [ ] Commit: `feat(detail): tell what the page shows and link tags to the archive`

### Task 6 — Verifica visiva e build

- [ ] `npm run generate`; screenshot a 390px e 1280px: home, home filtrata, dettaglio di una release, dettaglio con estratto.
- [ ] Controllo da tastiera della barra (focus visibile, ordine).
- [ ] Correzioni emerse, commit `style: …` se servono.

### Task 7 — Documentazione

- [ ] `CLAUDE.md`: prodotto (barra dei filtri, card senza testo), sezione della tappa 5 con i file.
- [ ] Commit: `docs: update CLAUDE.md after stage 5`

### Task 8 — Rilascio · con il via di Giovanni

- [ ] Merge in `staging` e in `main`, push.
- [ ] `staging` riallineato con `main` se il bot ha committato.
