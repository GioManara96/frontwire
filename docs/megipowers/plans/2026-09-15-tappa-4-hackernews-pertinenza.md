# Tappa 4 — Piano di lavoro

> **Chi esegue:** Claude scrive codice, test e documentazione (vedi `CLAUDE.md`). Push, merge in `staging`/`main` e lancio dell'Action solo con il via di Giovanni. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** Hacker News, tre newsletter e Simon Willison nell'archivio; niente articoli AI fuori tema; dev.to fuori.

**Architettura:** `runPipeline` passa da "fonti con feed" a un adattatore per tipo di fonte (`blog` e `github-release` → `normalizeFeed`, `hn` → `normalizeHackerNews`), con un fetch di testo generico. Categoria e tag si ricavano dal titolo per le fonti che non li fissano. Il filtro di pertinenza è un passo unico dopo la normalizzazione, per tutti gli articoli `ai`.

**Stack:** come la tappa 3 (Node 24, TypeScript strict, `tsx`, `feedsmith`, `sanitize-html`, Vitest).

**Specifica:** `docs/megipowers/specs/2026-09-15-tappa-4-hackernews-pertinenza-design.md`

---

## Come si lavora

- Branch unico `feat/hackernews-and-relevance` da `staging` (già riallineato con `main`), un commit per task.
- Test prima del codice: per ogni task si scrivono i test, si vedono fallire, si implementa.
- I task 1 e 3 sono finiti in un solo commit: `normalize.ts` usa `topicOf`, e i test di `topicOf` usano il registro nuovo.
- Verifica a ogni task: `npx vitest run test/unit`, `npm run typecheck`, `npm run lint`.

---

### Task 1 — Vocabolario e registro

**File:** `shared/utils/tags.ts`, `shared/utils/sources.ts`, `test/unit/sources.test.ts`, `test/unit/articles.test.ts`.

- [x] Test del registro con le tabelle delle spec 3 e 4: `kind: "blog"`, le quattro fonti nuove nell'ordine giusto, `hackernews` in fondo, niente `devto`; categoria e tag presenti in coppia o assenti in coppia; `excerpt: false` solo sulle newsletter; tag `javascript` e `web-platform` con le loro icone.
- [x] `articles.test.ts`: la fixture usa `nuxt-blog` al posto di `devto`.
- [x] Implementazione: `SourceKind` senza `devto`; `rss` → `blog`; categoria e tag facoltativi in coppia; `excerpt?: false`; le nuove voci.
- [x] Commit: `feat(sources): add Hacker News, three newsletters and Simon Willison, drop dev.to`

### Task 2 — Fetch di testo

**File:** `pipeline/fetch-feed.ts` → `pipeline/fetch-text.ts`, `pipeline/run.ts`, `pipeline/pipeline.ts`, `test/unit/pipeline/pipeline.test.ts`.

- [x] Rinomina di `fetchFeed` in `fetchText` (anche in `PipelineDeps`), stesso comportamento.
- [x] Commit: `refactor(pipeline): fetch any text, not only feeds`

### Task 3 — Categoria e tag dal titolo

**File:** `pipeline/assign-tags.ts`, `test/unit/pipeline/assign-tags.test.ts`.

- [x] Test: parole chiave `JavaScript` → `javascript`; `CSS`, `HTML`, `WebAssembly`, `Wasm` → `web-platform` (non `HTML5`); `categoryOf` dà `ai` con almeno un tag AI e `frontend` altrimenti; `topicOf` con una fonte a categoria fissa dà categoria e tag di default più le parole chiave, con una fonte "dal titolo" dà i tag delle parole chiave e la categoria ricavata, o `undefined` se il titolo non ne ha.
- [x] Implementazione.
- [x] Commit: `feat(pipeline): derive tags and category from the title`

### Task 4 — Filtro di pertinenza

**File:** `pipeline/relevance.ts`, `test/unit/pipeline/relevance.test.ts`.

- [x] Test: ogni forma di modello della spec (con trattino, trattino non separabile, spazio) e ogni termine da sviluppatore passano; i titoli scartati della prova reale ("Introducing WeatherNext 3…", "Introducing ChatGPT for Financial Services", "Nvidia to acquire Hugging Face", "I resigned from Anthropic today") non passano; parola intera (`capital` non è `API`).
- [x] Implementazione di `isDeveloperRelevant(title)`.
- [x] Commit: `feat(pipeline): keep only AI articles that matter to web developers`

### Task 5 — Blog RSS e Atom, newsletter, fonti dal titolo

**File:** `pipeline/normalize.ts`, `test/fixtures/feeds/atom-blog.xml`, `test/unit/pipeline/normalize.test.ts`.

- [x] Fixture Atom con voci: `summary` HTML, solo `content`, nessun testo, senza link `alternate`, solo `updated`, fuori finestra, titolo senza parole del vocabolario.
- [x] Test: una fonte `blog` normalizza RSS e Atom; `excerpt: false` omette l'estratto; `simon-willison` ricava tag e categoria dal titolo e scarta le voci senza parole chiave; `github-release` con un feed RSS resta un errore; una fonte `blog` con un JSON resta un errore.
- [x] Implementazione.
- [x] Commit: `feat(pipeline): read Atom blogs, newsletters and title-only sources`

### Task 6 — Adattatore Hacker News

**File:** `pipeline/config.ts`, `pipeline/hackernews.ts`, `test/fixtures/feeds/hackernews.json`, `test/unit/pipeline/hackernews.test.ts`.

- [x] Fixture con le forme reali di Algolia: storia con link, Ask HN senza link, sotto soglia, fuori finestra, senza parole chiave, senza titolo, link relativo, storia AI.
- [x] Test: `hackerNewsUrl(now)` (endpoint, `tags=story`, finestra in secondi, soglia); articolo completo (`url`, `discussionUrl`, `id`, data, tag, categoria, niente estratto né copertina); Ask HN con `url` = discussione; scarti contati; JSON non valido o senza `hits` → errore.
- [x] Implementazione di `hackerNewsUrl` e `normalizeHackerNews`; `HN_MIN_POINTS = 300`.
- [x] Commit: `feat(pipeline): import Hacker News stories through Algolia`

### Task 7 — Orchestrazione

**File:** `pipeline/pipeline.ts`, `test/unit/pipeline/pipeline.test.ts`.

- [x] Test: 21 richieste distinte, una per fonte, compresa quella ad Algolia; storie HN nell'archivio; una storia HN con lo stesso URL di un post di blog resta al blog; gli articoli AI non pertinenti non entrano e finiscono in `skipped`; warning e fallimento totale come prima.
- [x] Implementazione.
- [x] Commit: `feat(pipeline): run every source through its adapter and the relevance filter`

### Task 8 — Archivio vero

- [x] `echo '[]' > data/articles.json && npm run pipeline`; controllare a mano i titoli per fonte contro il focus della spec.
- [x] Secondo run: file identico.
- [x] `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run generate`.
- [x] Commit: `chore(data): regenerate the archive with Hacker News, newsletters and the relevance filter`

### Task 9 — Documentazione

- [x] `CLAUDE.md`: focus, filtro, fonti nuove/escluse/candidate, file della pipeline.
- [x] Commit: `docs: update CLAUDE.md after stage 4`

### Task 10 — Rilascio · con il via di Giovanni

- [ ] Merge in `staging` e in `main`, push.
- [ ] `gh workflow run ingest.yml --ref main`, run verde.
- [ ] `staging` riallineato con `main` se il bot ha committato.
