# Tappa 1 — Modello dati, archivio e dettaglio

Data: 2026-09-14

## Obiettivo e confini

Prima tappa di frontwire: il modello dei dati, un archivio di articoli finti e le due pagine (archivio e dettaglio) in **HTML semplice, senza grafica**.

**Dentro:** tipi e costanti in `shared/`, dati finti in `data/articles.json`, due route server, due pagine, funzioni di utilità, configurazione di ESLint/Prettier/Vitest, test, `vercel.json`.

**Fuori (tappe successive):** barra dei filtri, preferiti, pipeline di importazione, grafica e icone, collegamento del progetto Vercel e del sottodominio.

## Chi fa cosa

- **Giovanni:** il codice dell'app (`shared/`, `server/`, `app/`).
- **Claude:** configurazione degli strumenti, dati finti, test, revisione dei commenti in code review, documentazione.

## Modello dei dati (`shared/`)

La cartella `shared/` di Nuxt 4 è visibile sia all'app sia al server; la pipeline, più avanti, la importerà con percorsi relativi. È l'unica fonte di verità del modello.

### Vocabolario dei tag — `shared/utils/tags.ts`

Oggetto costante `TAGS`; il tipo `TagId` è l'unione delle sue chiavi. Ogni voce ha:

- `label`: nome leggibile. Serve anche quando si mostra solo l'icona, come `aria-label`/`title`.
- `icon`: nome Iconify.

Vocabolario iniziale (icone verificate sull'API Iconify):

| Tag           | Label        | Icona                                          |
| ------------- | ------------ | ---------------------------------------------- |
| `nuxt`        | Nuxt         | `simple-icons:nuxt`                            |
| `vue`         | Vue          | `simple-icons:vuedotjs`                        |
| `react`       | React        | `simple-icons:react`                           |
| `nextjs`      | Next.js      | `simple-icons:nextdotjs`                       |
| `vite`        | Vite         | `simple-icons:vite`                            |
| `svelte`      | Svelte       | `simple-icons:svelte`                          |
| `typescript`  | TypeScript   | `simple-icons:typescript`                      |
| `openai`      | OpenAI       | `simple-icons:openai`                          |
| `anthropic`   | Anthropic    | `simple-icons:anthropic`                       |
| `deepseek`    | DeepSeek     | `simple-icons:deepseek`                        |
| `huggingface` | Hugging Face | `simple-icons:huggingface`                     |
| `gemini`      | Gemini       | `simple-icons:googlegemini`                    |
| `release`     | Release      | `material-symbols-light:rocket-launch-outline` |

In questa tappa i tag si mostrano come testo (`label`); le icone arrivano con la grafica.

### Registro delle fonti — `shared/utils/sources.ts`

Oggetto costante `SOURCES`; il tipo `SourceId` è l'unione delle chiavi. Ogni voce ha `name`, `kind` (`'rss' | 'github-release' | 'hn' | 'devto'`) e `icon` (servirà anche come immagine sostitutiva quando manca la copertina).

Fonti necessarie per i dati finti:

| Fonte           | Nome          | Tipo             | Icona                      |
| --------------- | ------------- | ---------------- | -------------------------- |
| `nuxt-releases` | Nuxt releases | `github-release` | `simple-icons:nuxt`        |
| `openai-news`   | OpenAI News   | `rss`            | `simple-icons:openai`      |
| `devto`         | DEV Community | `devto`          | `simple-icons:devdotto`    |
| `hackernews`    | Hacker News   | `hn`             | `simple-icons:ycombinator` |

### `Article` — `shared/types/article.ts`

| Campo            | Tipo                 | Significato                                                                                   |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `id`             | `string`             | Hash dell'URL originale normalizzato (vedi sotto). Compare nell'URL della pagina di dettaglio |
| `title`          | `string`             | Per le release va composto dal nome del progetto e dal tag: `"Nuxt v4.5.2"`                   |
| `url`            | `string`             | URL assoluto dell'originale. Per dev.to è `canonical_url`                                     |
| `sourceId`       | `SourceId`           |                                                                                               |
| `publishedAt`    | `string`             | ISO 8601 in UTC (`2026-09-14T12:19:00Z`)                                                      |
| `category`       | `'frontend' \| 'ai'` |                                                                                               |
| `tags`           | `TagId[]`            | Solo dal vocabolario                                                                          |
| `excerpt?`       | `string`             | Testo semplice fornito dalla fonte                                                            |
| `summary?`       | `string`             | Riassunto AI in testo semplice                                                                |
| `contentHtml?`   | `string`             | Solo per le release: note di rilascio già ripulite                                            |
| `discussionUrl?` | `string`             | Solo per HN: la pagina della discussione                                                      |
| `coverImageUrl?` | `string`             | URL assoluto della copertina, se la fonte ce l'ha                                             |

Convenzioni:

- I campi facoltativi, se mancano, vengono **omessi**, mai messi a `null`.
- `ArticleListItem` = `Article` senza `contentHtml`: è quello che riceve l'archivio.

### Algoritmo dell'`id`

L'ID si ricava dall'URL, così lo stesso articolo arrivato da due fonti produce lo stesso ID e il duplicato si elimina da solo. Per le discussioni HN senza link si usa `discussionUrl`.

1. Host in minuscolo, senza `www.` iniziale.
2. Rimuovere il frammento (`#…`).
3. Rimuovere i parametri di tracciamento: `utm_*` e `ref`. Ordinare alfabeticamente quelli rimasti.
4. Rimuovere la `/` finale del percorso, tranne che per la radice.
5. `id` = primi 12 caratteri esadecimali dello SHA-256 della stringa ottenuta.

In questa tappa l'algoritmo serve solo per scrivere i dati finti; la sua implementazione nel codice arriva con la pipeline.

## Dati — `data/articles.json`

Un array di `Article` nella radice del progetto, fuori da `app/`. Per ora contiene una decina di articoli finti ma realistici, basati su contenuti veri, che coprono i casi limite:

- release con `contentHtml`
- post RSS con estratto e senza copertina
- post dev.to con copertina ed estratto
- link HN con `discussionUrl` e nessun testo
- almeno un articolo con `summary`

Più avanti lo scriverà la pipeline, con lo stesso formato.

## Server

Handler leggeri: la logica sta in funzioni pure in `server/utils/`, testabili senza avviare Nuxt. Queste funzioni non devono dipendere dagli auto-import di Nuxt; `createError` resta negli handler.

- `server/api/articles.get.ts`: restituisce `ArticleListItem[]`, ordinati per `publishedAt` decrescente.
- `server/api/articles/[id].get.ts`: restituisce l'`Article`, oppure un 404 con `createError`.

## Pagine (`app/`)

- `app/app.vue`: `<NuxtPage />` al posto di `<NuxtWelcome />`.
- `app/pages/index.vue`, archivio: per ogni articolo copertina o immagine sostitutiva, titolo con link al dettaglio, nome della fonte, data, categoria, tag (testo), testo dell'articolo. Messaggio dedicato se la lista è vuota.

Immagine sostitutiva: in questa tappa è un semplice segnaposto in HTML (un riquadro con il nome della fonte); con la grafica diventerà l'icona della fonte, presa dal registro.

- `app/pages/articles/[id].vue`, dettaglio: gli stessi dati, `contentHtml` con `v-html` quando presente, link "Read the original" (nuova scheda, `rel="noopener"`), link alla discussione quando presente. Se l'API risponde 404, errore bloccante con `createError` e pagina di errore predefinita di Nuxt.

Funzioni di utilità in `shared/utils/`, usate da entrambe le pagine:

- **Testo dell'articolo:** `summary` se presente, altrimenti `excerpt`, altrimenti nessun testo (in quel caso la pagina non mostra il blocco).
- **Formattazione della data:** lingua `en-US` e fuso orario `UTC` fissi. La pagina viene generata in build (server, UTC) e riattivata nel browser (fuso del visitatore): con impostazioni diverse il testo cambierebbe tra i due momenti e Vue segnalerebbe un errore di hydration.

## Errori

| Caso                           | Comportamento                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| ID inesistente                 | 404 dall'API, pagina di errore di Nuxt                                                                                    |
| Campi facoltativi mancanti     | Immagine sostitutiva per la copertina; nessun blocco di testo se mancano riassunto ed estratto                            |
| Dati non validi nel JSON       | Li intercetta il test di integrità (TypeScript non può: i JSON importati hanno tipi generici, i tag diventano `string[]`) |
| `contentHtml`                  | Unico campo mostrato con `v-html`; affidabile perché ripulito a monte. Nei dati finti solo HTML pulito                    |
| Errore durante `nuxt generate` | La build si ferma: su Vercel non va niente di rotto                                                                       |

## Test (Vitest, ambiente `node`)

- **Utilità:** scelta del testo (riassunto, estratto, niente); formattazione della data, compreso un orario vicino alla mezzanotte UTC che non deve slittare di un giorno.
- **Integrità di `data/articles.json`:** tag nel vocabolario, `sourceId` nel registro, `publishedAt` ISO UTC valido, ID di 12 caratteri esadecimali e unici, URL assoluti `http(s)`, campi obbligatori presenti.
- **Funzioni del server:** ordinamento decrescente, esclusione di `contentHtml`, ricerca per ID (trovato e non trovato).
- **Pagine:** nessun test sui componenti in questa tappa.

## Strumenti e deploy

- **ESLint** con `@nuxt/eslint`, **Prettier** con `printWidth: 120` e `eslint-config-prettier` per non avere regole in conflitto.
- **Vitest** in ambiente `node`.
- Script npm: `lint`, `format`, `format:check`, `test`.
- **`vercel.json`** come nel portfolio: `NITRO_PRESET=static nuxt generate`, output `.output/public`.
