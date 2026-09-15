# Tappa 4 — Hacker News, newsletter e pertinenza

Data: 2026-09-15

## Obiettivo e confini

Portare nell'archivio le fonti che mancano (Hacker News, tre newsletter curate, il blog di Simon Willison) e togliere il rumore: il focus di Frontwire è il **web development**, quindi un articolo sull'AI entra solo se riguarda modelli, API o strumenti per sviluppatori.

**Dentro:** adattatore Hacker News (API Algolia); This Week In React, JavaScript Weekly, Frontend Focus e Simon Willison; fonti con categoria e tag ricavati dal titolo; filtro di pertinenza sugli articoli AI; tag `javascript` e `web-platform`; il tipo di fonte `rss` diventa `blog` e accetta anche Atom; rimozione di dev.to; archivio rigenerato da vuoto.

**Fuori:** rifiniture grafiche, barra dei filtri, preferiti, progetto Vercel e sottodominio.

## Decisioni che cambiano `CLAUDE.md`

- **Il focus è il web development.** Tra gli articoli AI restano solo quelli su modelli, API e strumenti per sviluppatori. L'AI applicata ad altri campi (clima, genomica, finanza), la politica e la cronaca aziendale restano fuori. Il filtro è deterministico e lavora sul titolo, perché un classificatore AI costerebbe soldi (decisione del 2026-09-15, dopo che nell'archivio erano comparsi articoli come "WeatherNext 3" e "AlphaGenome Atlas").
- **dev.to è escluso.** Sui dati reali del 2026-09-15 i post a tema raccolgono poche reazioni: il migliore di Vue ne ha 32, Svelte 5. I 3 più recenti sopra una soglia ragionevole erano esercizi di algoritmi etichettati `typescript` e post d'opinione generici sull'AI. In più l'API accetta un solo tag per richiesta.
- **Nuove fonti:** Hacker News con almeno 300 punti; This Week In React, JavaScript Weekly e Frontend Focus, newsletter settimanali curate; Simon Willison per l'uso degli LLM nello sviluppo. Il tetto resta di 3 articoli per fonte: l'archivio passa da circa 20 a circa 30 articoli, da rivalutare sui dati veri.
- **Scartate dopo la verifica dei feed:** web.dev, Chrome for Developers, MDN, Deno e Google Developers (fermi da mesi); Vercel (circa 100 voci al mese, quasi tutte changelog di prodotto e storie di clienti); Smashing Magazine (saggi di UX, non notizie); Node.js e Bun (quasi solo patch release); Angular (fuori dallo stack di Giovanni). Astro, Tailwind e WebKit sono candidati per più avanti.

## Fonti

### Nuove fonti con feed (`blog`)

Feed verificati il 2026-09-15: rispondono tutti `200`.

| `id`                 | Nome               | Feed                                                      | Categoria  | Tag di default | Icona                              |
| -------------------- | ------------------ | --------------------------------------------------------- | ---------- | -------------- | ---------------------------------- |
| `this-week-in-react` | This Week In React | `https://thisweekinreact.com/newsletter/rss.xml`          | `frontend` | `react`        | `simple-icons:react`               |
| `javascript-weekly`  | JavaScript Weekly  | `https://cprss.s3.amazonaws.com/javascriptweekly.com.xml` | `frontend` | `javascript`   | `simple-icons:javascript`          |
| `frontend-focus`     | Frontend Focus     | `https://cprss.s3.amazonaws.com/frontendfoc.us.xml`       | `frontend` | `web-platform` | `material-symbols-light:web`       |
| `simon-willison`     | Simon Willison     | `https://simonwillison.net/atom/entries/`                 | dal titolo | dal titolo     | `material-symbols-light:edit-note` |

- Le tre newsletter pubblicano un numero a settimana. Il titolo della voce nomina le notizie principali ("When 8 chunks weigh more than 355", "This Week In React #296: React 19.3, DevTools…"), il link porta alla pagina del numero.
- Le newsletter **non hanno estratto**. JavaScript Weekly e Frontend Focus mettono nella descrizione l'intero numero, testata compresa ("#801 — September 8, 2026 Read on the Web…"); This Week In React ci mette solo il saluto ("Hi everyone, Seb and Jan here 👋"). Un estratto così è peggio di nessuno.
- Il feed di Simon Willison è **Atom**, con un riassunto HTML per voce, da cui si ricava l'estratto.

### Hacker News (`hn`)

Nessun feed: una richiesta all'API di ricerca di Algolia, gratuita e senza chiave.

| `id`         | Nome        | Categoria  | Tag        | Icona                      |
| ------------ | ----------- | ---------- | ---------- | -------------------------- |
| `hackernews` | Hacker News | dal titolo | dal titolo | `simple-icons:ycombinator` |

### Registro (`shared/utils/sources.ts`)

- **`kind: "rss"` diventa `kind: "blog"`**: un blog o una newsletter, con feed RSS **o** Atom. Il tipo descrive cosa è la fonte, non il formato; `github-release` resta Atom.
- **Categoria e tag** di una fonte con feed sono o entrambi presenti (categoria fissa e tag di default, almeno uno) o entrambi assenti: in quel caso vengono dal titolo (vedi sotto). Oggi sono "dal titolo" `simon-willison` e `hackernews`.
- **`excerpt: false`**, facoltativo, solo per `blog`: le voci non hanno estratto. Lo usano le tre newsletter.
- `hackernews` resta senza `feedUrl`; `devto` esce dal registro e `"devto"` da `SourceKind`.
- Ordine delle chiavi: i blog di oggi, poi `this-week-in-react`, `javascript-weekly`, `frontend-focus`, `simon-willison`, poi le release, e `hackernews` in fondo. Quando due fonti portano lo stesso URL vince la prima: una storia HN che rimanda a un post di un blog ufficiale lascia l'articolo al blog.

### Vocabolario (`shared/utils/tags.ts`)

Due tag nuovi, dopo `typescript`:

| Tag            | Label        | Icona                        | Parole chiave nel titolo             |
| -------------- | ------------ | ---------------------------- | ------------------------------------ |
| `javascript`   | JavaScript   | `simple-icons:javascript`    | `JavaScript`                         |
| `web-platform` | Web platform | `material-symbols-light:web` | `CSS`, `HTML`, `WebAssembly`, `Wasm` |

Le parole chiave valgono per tutte le fonti, come le altre. Su HN portano storie frontend che il vocabolario di oggi non vede: nella prova del 2026-09-15 "HTML Can Do That" (1.023 punti), "Ambient CSS v3", "It took a year to ship WebAssembly in Anubis".

## Categoria e tag dal titolo

Per le fonti senza categoria fissa:

- i tag sono quelli delle parole chiave nel titolo; se non ce n'è nessuno la voce si scarta (è il caso della gran parte di HN);
- la categoria è `ai` se tra i tag c'è un tag AI (`openai`, `anthropic`, `deepseek`, `huggingface`, `gemini`, `deepmind`), altrimenti `frontend`. Un titolo misto ("Claude, change the button to blue in React") va in `ai` e passa dal filtro di pertinenza.

## Filtro di pertinenza (`pipeline/relevance.ts`)

Vale per **ogni articolo con categoria `ai`**, di qualunque fonte, dopo la normalizzazione e prima dell'unione con l'archivio; gli scarti si sommano a `skipped`. Le fonti `frontend` non passano dal filtro: i loro feed sono in tema per definizione.

Il titolo passa se contiene, per parola intera e senza distinzione di maiuscole, almeno uno di:

- **un modello con la versione**: `GPT-6`, `GPT 5.6`, `GPT‑Live‑1` (trattino, trattino non separabile o spazio), `o3`; `Claude 5`, `Claude Opus 5`, `Fable 5`, `Opus 5` (anche Sonnet, Haiku, Mythos); `Gemini 3.8`, `Gemini Omni 1.1`; `Gemma 4`; `DeepSeek v4`, `DeepSeek-R2`; `Llama 5`; `Qwen 3.8`;
- **un termine da sviluppatore**: `API`/`APIs`, `SDK`/`SDKs`, `CLI`, `Codex`, `Claude Code`, `coding`, `developer`/`developers`, `MCP`, `WebGPU`, `JavaScript`, `TypeScript`, `open weights`/`open-weights`, e i nomi del vocabolario frontend (`React`, `Vue`, `Nuxt`, `Next.js`, `Vite`, `Svelte`).

Prova sui feed reali (ultimi 30 giorni, 2026-09-15):

| Fonte                       | Tenuti | Esempi tenuti                                           | Esempi scartati                                                           |
| --------------------------- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| OpenAI (Product e Research) | 5/16   | "Introducing the Agents API", "GPT-6 Astra: …"          | "Introducing ChatGPT for Financial Services", "ChatGPT Ads"               |
| Google DeepMind             | 3/9    | "Introducing Gemini 3.8 Flash and 3.8 Flash Cyber"      | "AlphaGenome Atlas", "Introducing WeatherNext 3"                          |
| Hugging Face                | 3/21   | "Introducing @huggingface/kernels: 200+ WebGPU Kernels" | "Async GRPO with LoRA across HF Jobs"                                     |
| Anthropic (mirror)          | 0/5    | —                                                       | "Improving our alignment and security efforts"                            |
| Hacker News, ≥ 300 punti    | 17/43  | "DeepSeek v4.1 Flash", "Breaking Claude Code…"          | "Pentagon's blacklisting of Anthropic…", "Nvidia to acquire Hugging Face" |

Limiti noti: qualche falso negativo ("Introducing agentic video understanding with Gemini" non cita una versione) e qualche falso positivo (una polemica che nomina un modello con la versione). Le regole stanno in un solo modulo, accanto a quelle dei tag, e si tarano lì. Il mirror Anthropic, nell'ultimo mese, ha pubblicato solo post aziendali; i lanci di Anthropic arrivano comunque da HN e da Simon Willison.

## Hacker News (`pipeline/hackernews.ts`)

**Richiesta:** `GET https://hn.algolia.com/api/v1/search_by_date` con `tags=story`, `numericFilters=created_at_i>=<adesso − 30 giorni>,points>=300` e `hitsPerPage=1000`. Nella prova i risultati sono circa 560, sotto il limite di 1.000; se lo superassero, `search_by_date` perderebbe i più vecchi, che il tetto di 3 escluderebbe comunque.

**Normalizzazione di ogni risultato:**

- `title`: il titolo senza spazi ai bordi; senza titolo, scartato.
- `tags` e `category`: dal titolo (sopra). Se la categoria è `ai`, passa dal filtro di pertinenza.
- `url`: il link della storia se è un URL assoluto `http(s)`; altrimenti (Ask HN, Tell HN) la pagina della discussione.
- `discussionUrl`: sempre `https://news.ycombinator.com/item?id=<objectID>`.
- `id`: dall'`url`, con l'algoritmo di sempre. Una storia che rimanda a un articolo già importato da un'altra fonte ha lo stesso `id` e si fonde con quello.
- `publishedAt`: `created_at` in ISO 8601 UTC.
- Niente estratto (il testo delle Ask HN è un post di un utente, non un riassunto) e niente copertina.
- Soglia di punti e finestra si ricontrollano anche in locale, così la normalizzazione non dipende da cosa filtra l'API.

I punti crescono nel tempo: una storia entra al primo run in cui ha superato la soglia, se è ancora nella finestra, e da lì il record resta immutabile. Con il tetto di 3, le storie HN in archivio cambiano ogni due giorni circa.

## Pipeline

- `fetchFeed` diventa **`fetchText`** (`pipeline/fetch-text.ts`), con lo stesso comportamento: il testo della risposta o un errore. Serve per i feed XML e per il JSON di Algolia.
- `runPipeline` scarica **tutte** le fonti del registro in parallelo, nell'ordine del registro. Per `blog` e `github-release` usa `normalizeFeed`; per `hn` chiede l'URL di Algolia e usa `normalizeHackerNews`. Poi applica il filtro di pertinenza agli articoli `ai` e unisce con l'archivio come prima.
- Una fonte che fallisce resta un warning; il run fallisce solo se falliscono tutte e 21.
- `normalizeFeed` per le fonti `blog` accetta RSS e Atom. Nelle voci Atom `url` è il link `alternate`, la data è `published` o, se manca, `updated`, e l'estratto viene da `summary` o, se manca, da `content`.

| File                      | Cambia                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `shared/utils/sources.ts` | `blog`, categoria e tag facoltativi in coppia, `excerpt: false`, nuove fonti, via `devto` |
| `shared/utils/tags.ts`    | `javascript`, `web-platform`                                                              |
| `pipeline/config.ts`      | `HN_MIN_POINTS = 300`                                                                     |
| `pipeline/fetch-text.ts`  | Rinomina di `fetch-feed.ts`                                                               |
| `pipeline/assign-tags.ts` | Parole chiave dei nuovi tag; categoria e tag dal titolo                                   |
| `pipeline/relevance.ts`   | Nuovo: il filtro di pertinenza                                                            |
| `pipeline/hackernews.ts`  | Nuovo: URL della richiesta e normalizzazione dei risultati                                |
| `pipeline/normalize.ts`   | `blog` con RSS e Atom, `excerpt: false`, categoria e tag dal titolo                       |
| `pipeline/pipeline.ts`    | Tutte le fonti, adattatore per tipo, filtro di pertinenza                                 |
| `pipeline/run.ts`         | Usa `fetchText`                                                                           |

## Errori e casi limite

| Caso                                                             | Comportamento                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Algolia non risponde, stato HTTP, JSON non valido o senza `hits` | Warning, fonte saltata                                                  |
| Storia senza parole del vocabolario nel titolo                   | Scartata e contata                                                      |
| Storia senza link (Ask HN, Tell HN)                              | `url` = pagina della discussione                                        |
| Storia sotto soglia o fuori finestra                             | Scartata e contata                                                      |
| Articolo AI senza modello né termine da sviluppatore             | Scartato dal filtro di pertinenza e contato                             |
| Voce di un blog "dal titolo" senza parole del vocabolario        | Scartata e contata                                                      |
| Feed `blog` Atom                                                 | Normalizzato come l'RSS                                                 |
| Feed `github-release` in RSS                                     | Errore di formato, warning (come oggi)                                  |
| Articoli già in archivio che il filtro scarterebbe               | Restano (record immutabili): per questo l'archivio si rigenera da vuoto |

## Test (Vitest, niente rete)

Fixture nuove in `test/fixtures/feeds/`: `atom-blog.xml` (voci Atom con `summary`, con `content`, senza testo, senza link, fuori finestra) e `hackernews.json` (storie con link, Ask HN senza link, sotto soglia, fuori finestra, senza parole chiave, senza titolo, AI pertinente e non).

- `sources`: il registro corrisponde alle tabelle delle due spec, ordine compreso; categoria e tag in coppia; `excerpt: false` solo sulle newsletter; nessuna fonte `devto`; icone esistenti.
- `assign-tags`: parole chiave di `javascript` e `web-platform`; categoria dai tag; titolo senza parole chiave → nessun tag.
- `relevance`: ogni forma di modello e ogni termine della lista passano; i titoli scartati della prova reale restano fuori.
- `normalize`: RSS e Atom per `blog`; `excerpt: false`; fonti dal titolo (tag, categoria, scarto); il formato sbagliato per le release resta un errore.
- `hackernews`: URL della richiesta (finestra e soglia); ogni regola di normalizzazione; JSON non valido.
- `pipeline`: una richiesta per ognuna delle 21 fonti; HN importato e deduplicato contro un blog; filtro di pertinenza con i conteggi; warning e fallimento totale come prima.
- `articles`: le fixture non usano più `devto`.
- Test d'integrità: invariato (`discussionUrl` solo per `hn`).

## Documentazione

`CLAUDE.md`: focus sul web development e filtro di pertinenza (Prodotto e Architettura); fonti nuove, escluse e candidate; sezione Pipeline con `hackernews.ts`, `relevance.ts`, `fetch-text.ts`. Nel piano della tappa 3 si spuntano i passi del Task 11 già fatti.

## Criteri di accettazione

- `npm run pipeline` da archivio vuoto produce un `data/articles.json` che passa il test d'integrità, con articoli di HN, delle newsletter e di Simon Willison e senza articoli AI fuori tema; un secondo run lo lascia identico.
- `npm run lint`, `npm run format:check`, `npm run typecheck` e `npm test` passano; `nuxt generate` produce il sito.
- Dopo il merge in `main` (con il via di Giovanni), un run manuale dell'Action è verde.
