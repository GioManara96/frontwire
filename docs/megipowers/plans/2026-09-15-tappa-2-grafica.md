# Tappa 2 — Piano di lavoro (grafica)

> **Chi esegue:** il codice dell'app (`nuxt.config.ts`, `app/`, CSS e template) lo scrive Giovanni; Claude si occupa di spec, documentazione e revisione dei commenti in code review (vedi `CLAUDE.md`). Questa tappa è quasi tutta CSS e markup: non introduce test obbligatori. Ogni task indica il responsabile. I passi usano le checkbox (`- [ ]`).

**Obiettivo:** vestire archivio e dettaglio con l'identità visiva della spec, scura e mobile-first, senza toccare dati né route.

**Specifica:** `docs/megipowers/specs/2026-09-15-tappa-2-grafica-design.md`

**Stack aggiunto:** Tailwind CSS v4 (`@tailwindcss/vite`), `@nuxt/icon` con `@iconify-json/simple-icons` e `@iconify-json/material-symbols-light`, `@nuxt/fonts`.

---

## Come si lavora

- Tappa su un branch unico, `feat/visual-design`, creato da `staging`. Un commit per task; a fine tappa Giovanni fa il merge in `staging`.
- A fine task di Giovanni, Claude fa la code review e riscrive i commenti secondo `CLAUDE.md`, toccando solo i commenti.
- Il markup e i dati non cambiano: si vestono i template esistenti. Se un template va ristrutturato, resta lo stesso contenuto e gli stessi campi.
- Verifica continua: dopo ogni task, `npm run lint && npm run typecheck` e un'occhiata a `npm run dev` **da viewport mobile** (360px) prima che da desktop.

## Mappa dei file

| File                                                                | Chi      | Responsabilità                                           |
| ------------------------------------------------------------------- | -------- | -------------------------------------------------------- |
| `nuxt.config.ts`                                                    | Giovanni | Moduli, plugin Vite di Tailwind, `css`, `app.head`       |
| `package.json`                                                      | Giovanni | Nuove dipendenze                                         |
| `app/assets/css/main.css`                                           | Giovanni | Import Tailwind, `@theme` con i token, classi semantiche |
| `app/app.vue`, `app/pages/index.vue`, `app/pages/articles/[id].vue` | Giovanni | Restyle dei template                                     |
| `app/error.vue`                                                     | Giovanni | Pagina di errore vestita                                 |
| `public/` (favicon, apple-touch, og)                                | Giovanni | Asset del marchio                                        |
| `CLAUDE.md`                                                         | Claude   | Aggiornare Stack e flusso dati a fine tappa              |

---

### Task 1 — Stack CSS, icone e font · **Giovanni**

**Obiettivo:** montare Tailwind v4, le icone e i font, senza ancora ridisegnare nulla. Alla fine il sito è identico ma la pipeline CSS è attiva.

- [x] **Passo 1: branch**

```bash
git switch -c feat/visual-design staging
```

- [x] **Passo 2: dipendenze**

```bash
npm i tailwindcss @tailwindcss/vite @nuxt/icon @nuxt/fonts
npm i -D @iconify-json/simple-icons @iconify-json/material-symbols-light
```

- [x] **Passo 3: `nuxt.config.ts`**

- aggiungere il plugin Vite di Tailwind (`import tailwindcss from "@tailwindcss/vite"`, poi `vite: { plugins: [tailwindcss()] }`);
- aggiungere ai `modules`: `'@nuxt/icon'`, `'@nuxt/fonts'` (accanto a `'@nuxt/eslint'`);
- registrare il CSS globale: `css: ['~/assets/css/main.css']`.

- [x] **Passo 4: `app/assets/css/main.css`**

- `@import "tailwindcss";`
- blocco `@theme` con i token della spec (palette e font);
- `@layer base` minimo: sfondo `bg`, testo `text`, colore dei link su `accent`.

- [x] **Passo 5: verifica**

```bash
npm run dev
```

Atteso: il sito carica con il fondo carbonio e i font nuovi; nessun errore in console. Poi `npm run lint && npm run typecheck`.

- [x] **Passo 6: commit**: `chore: set up tailwind, icons and fonts`
- [x] **Claude:** code review

---

### Task 2 — Layout di base · **Giovanni**

**Obiettivo:** container, header e scheletro responsive, prima delle card.

- [x] **Passo 1**: classe semantica `.page` (container centrato, padding mobile, `max-width` ai breakpoint), applicata in `app.vue` o nelle pagine.
- [x] **Passo 2**: header minimale con il nome del sito che linka alla home.
- [x] **Passo 3**: `app/error.vue` di base, che usa `.page` e i token; mostra codice e messaggio, con link alla home.
- [x] **Passo 4**: verifica a 360px e da desktop; `lint` e `typecheck`.
- [x] **Passo 5: commit**: `style: add page container, header and error page`
- [x] **Claude:** code review

---

### Task 3 — Archivio a card · **Giovanni**

**Obiettivo:** la griglia di card della spec.

- [x] **Passo 1**: griglia responsive (1 colonna, 2 da `md`, 3 da `xl`) con gap uniforme.
- [x] **Passo 2**: card con classi semantiche: copertura o segnaposto, meta (fonte con icona, data, categoria), titolo-link in `display`, tag come pill con icona + label, testo con `line-clamp`.
- [x] **Passo 3**: immagine sostitutiva quando manca `coverImageUrl`: riquadro `surface` con l'icona della fonte (`SOURCES[sourceId].icon`) e il nome.
- [x] **Passo 4**: stato hover (bordo `accent`), rispettando `prefers-reduced-motion`.
- [x] **Passo 5**: messaggio "No articles yet." vestito.
- [x] **Passo 6**: verifica a 360px e desktop; controllare gli articoli HN (senza testo) e quelli senza copertina; `lint` e `typecheck`.
- [x] **Passo 7: commit**: `style: build the article archive grid`
- [x] **Claude:** code review

---

### Task 4 — Dettaglio e prose · **Giovanni**

**Obiettivo:** vestire la pagina di dettaglio e le note di rilascio.

- [x] **Passo 1**: colonna singola centrata con larghezza di lettura contenuta; copertura, meta, `h1` in `display`, tag, testo intero.
- [x] **Passo 2**: stili "prose" per `contentHtml` (`h2`/`h3`, `p`, `ul`/`li`, `a` in accento, `code`, `strong`), applicati al blocco `v-html`.
- [x] **Passo 3**: azioni: "Read the original" come pulsante-accento; "Discussion" quando presente; "Back to articles".
- [x] **Passo 4**: verifica su una release (con `contentHtml`), un post con copertina, un link HN; ricaricando il dettaglio, niente avvisi di hydration in console; `lint` e `typecheck`.
- [x] **Passo 5: commit**: `style: build the article detail page`
- [x] **Claude:** code review

---

### Task 5 — Marchio: favicon e meta social · **Giovanni**

**Obiettivo:** identità coerente con la famiglia.

- [x] **Passo 1**: produrre gli asset in `public/`: `favicon.ico`, `apple-touch-icon.png` (180×180), `og.png` (title + accento su fondo carbonio).
- [x] **Passo 2**: registrarli in `nuxt.config.ts` (`app.head`) insieme ai `<meta>` di base: `title`, `description`, `og:*`, `twitter:card`.
- [x] **Passo 3**: verifica: favicon nel tab; anteprima OG controllata sul file generato.
- [x] **Passo 4: commit**: `chore: add favicon and social meta`
- [x] **Claude:** code review

---

### Task 6 — Chiusura · **Giovanni**, poi **Claude**

- [x] **Giovanni:** verifica completa:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && NITRO_PRESET=static npx nuxt generate
```

- [x] **Giovanni:** giro finale a 360px e desktop su archivio, dettaglio, 404.
- [x] **Claude:** aggiornare `CLAUDE.md` (Stack e flusso dati con il CSS e i moduli nuovi) e committare: `docs: update CLAUDE.md after stage 2`.
- [x] **Giovanni:** merge di `feat/visual-design` in `staging`.
