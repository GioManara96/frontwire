# Tappa 3 — Pipeline di importazione

Data: 2026-09-15

## Obiettivo e confini

Sostituire i dati finti con articoli veri. Una GitHub Action pianificata legge i feed, normalizza le voci, elimina i duplicati, assegna tag e riassunti AI, scrive `data/articles.json` e fa commit su `main`. L'app non cambia: legge lo stesso file con le stesse funzioni di `server/utils/articles.ts`.

**Dentro:** registro delle fonti esteso, adapter RSS/Atom (che copre anche le GitHub Releases), normalizzazione e `id`, deduplica, tag, riassunti via Vercel AI Gateway, finestra di 30 giorni, workflow dell'Action, fixture e test, primo merge `staging` → `main` che attiva l'Action.

**Fuori (tappe successive):** Hacker News e dev.to (tappa breve subito dopo, a pipeline già in funzione), rifiniture grafiche (tappa a sé, sui dati veri), barra dei filtri, preferiti, progetto Vercel e sottodominio.

## Decisioni che cambiano `CLAUDE.md`

- **GitHub Models non esiste più.** La documentazione GitHub dice che dal 30 luglio 2026 "the playground, model catalog, inference API, and bring your own key (BYOK) are no longer available to any customer"; l'endpoint `models.github.ai` risponde `410`. Il provider diventa **Vercel AI Gateway**, solo nel free tier: account Vercel già esistente, una chiave nei secret del repo, il modello è una stringa `provider/model`. Se il modello gratuito non convince, i riassunti AI escono dal prodotto (sezione [Riassunti](#riassunti)).
- **Finestra di 30 giorni.** L'archivio tiene solo gli articoli pubblicati negli ultimi 30 giorni; la stessa regola limita il primo import (OpenAI ha 1.193 voci nel feed, Vercel 1.575). I preferiti sopravvivono perché salvano titolo e URL.
- **I dati vivono su `main`.** I workflow pianificati girano sempre sul branch di default, quindi l'Action committa su `main` e il push fa partire il deploy. `staging` si riallinea con un merge di `main` prima di aprire un nuovo branch; dopo questa tappa `data/` lo scrive solo il bot, quindi i conflitti sono improbabili.

## Chi fa cosa

- **Giovanni:** il codice in `pipeline/`, l'estensione di `shared/utils/sources.ts` e `shared/utils/tags.ts`, il workflow YAML, l'installazione delle dipendenze, la chiave AI Gateway e il secret GitHub, la valutazione dei riassunti.
- **Claude:** questa spec e il piano, fixture e test, l'aggiornamento di `CLAUDE.md` (concordato con Giovanni), la revisione dei commenti in code review.

## Fonti (v1)

Solo feed verificati il 2026-09-15 (tutti rispondono `200`). Il feed del blog di Vue è fermo a marzo 2024, quindi Vue entra solo con le release. Vercel (circa 100 voci al mese, blog e changelog mescolati) e le release di Claude Code (quasi quotidiane) restano fuori per non sommergere il resto.

### Blog e news (`rss`)

| `id`               | Nome                 | Feed                                                                                      | Categoria  | Tag di default |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------- | ---------- | -------------- |
| `nuxt-blog`        | Nuxt blog            | `https://nuxt.com/blog/rss.xml`                                                           | `frontend` | `nuxt`         |
| `nextjs-blog`      | Next.js blog         | `https://nextjs.org/feed.xml`                                                             | `frontend` | `nextjs`       |
| `react-blog`       | React blog           | `https://react.dev/rss.xml`                                                               | `frontend` | `react`        |
| `vite-blog`        | Vite blog            | `https://vite.dev/blog.rss`                                                               | `frontend` | `vite`         |
| `svelte-blog`      | Svelte blog          | `https://svelte.dev/blog/rss.xml`                                                         | `frontend` | `svelte`       |
| `typescript-blog`  | TypeScript blog      | `https://devblogs.microsoft.com/typescript/feed/`                                         | `frontend` | `typescript`   |
| `openai-news`      | OpenAI News          | `https://openai.com/news/rss.xml`                                                         | `ai`       | `openai`       |
| `huggingface-blog` | Hugging Face blog    | `https://huggingface.co/blog/feed.xml`                                                    | `ai`       | `huggingface`  |
| `deepmind-blog`    | Google DeepMind blog | `https://deepmind.google/blog/rss.xml`                                                    | `ai`       | `deepmind`     |
| `anthropic-news`   | Anthropic News       | `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml` | `ai`       | `anthropic`    |

`anthropic-news` è un mirror della community (Anthropic non ha un feed ufficiale): è una dipendenza esterna che può sparire, e la pipeline la tratta come qualsiasi fonte che non risponde.

### Release (`github-release`)

Feed Atom pubblico `https://github.com/<owner>/<repo>/releases.atom`. Tutte le fonti di questo tipo tengono **solo le release stabili**.

| `id`                  | Repo                   | Progetto (prefisso del titolo) | Categoria  | Tag di default          |
| --------------------- | ---------------------- | ------------------------------ | ---------- | ----------------------- |
| `nuxt-releases`       | `nuxt/nuxt`            | Nuxt                           | `frontend` | `nuxt`, `release`       |
| `vue-releases`        | `vuejs/core`           | Vue                            | `frontend` | `vue`, `release`        |
| `nextjs-releases`     | `vercel/next.js`       | Next.js                        | `frontend` | `nextjs`, `release`     |
| `react-releases`      | `facebook/react`       | React                          | `frontend` | `react`, `release`      |
| `vite-releases`       | `vitejs/vite`          | Vite                           | `frontend` | `vite`, `release`       |
| `typescript-releases` | `microsoft/TypeScript` | TypeScript                     | `frontend` | `typescript`, `release` |

### Registro (`shared/utils/sources.ts`)

Ogni fonte aggiunge ai campi attuali:

- `category`: la categoria di tutti i suoi articoli.
- `tags`: i tag di default, almeno uno (il test d'integrità richiede almeno un tag per articolo).
- `feedUrl`: obbligatorio per `rss` e `github-release`.
- `project`: solo per `github-release`, il prefisso del titolo.

`devto` e `hackernews` restano nel registro senza `feedUrl`: la pipeline elabora solo i tipi che sa leggere e li salta fino alla tappa successiva. Come esprimere "obbligatorio per certi tipi" nei tipi TypeScript (unione discriminata su `kind` o altro) lo decide Giovanni.

### Vocabolario (`shared/utils/tags.ts`)

Nuovo tag `deepmind` (label "DeepMind", icona `simple-icons:deepmind`, presente nella collezione installata).

## Struttura

Script TypeScript in `pipeline/`, eseguiti con `tsx` (`npm run pipeline` = `tsx pipeline/run.ts`). Importano `shared/` con percorsi relativi, come fa già `server/utils/articles.ts`: il modello resta uno solo per app e pipeline.

| File             | Responsabilità                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `run.ts`         | Punto d'ingresso: orchestra i passi, legge e scrive il JSON, log e annotazioni dell'Action, exit code |
| `config.ts`      | Costanti: modello, finestra, limiti, timeout, user-agent                                              |
| `fetch-feed.ts`  | Scarica un feed con timeout e user-agent; restituisce il testo o un errore                            |
| `normalize.ts`   | Voce di feed (da `feedsmith`) → `Article` candidato, oppure scarto con il motivo                      |
| `article-id.ts`  | Algoritmo dell'`id` fissato in tappa 1                                                                |
| `html.ts`        | Sanitize di `contentHtml`, HTML → testo semplice, troncamento dell'estratto                           |
| `assign-tags.ts` | Tag di default della fonte più quelli ricavati da parole chiave nel titolo                            |
| `merge.ts`       | Unione con l'archivio, deduplica, finestra di 30 giorni, ordinamento                                  |
| `summarize.ts`   | Unico punto che conosce il provider AI                                                                |
| `tsconfig.json`  | `strict`, include `pipeline/**` e `shared/**`                                                         |

Tutti i moduli tranne `run.ts`, `fetch-feed.ts` e `summarize.ts` sono **funzioni pure**: ricevono dati e restituiscono dati, senza rete né file. L'istante "adesso" è un parametro, così finestra e date si testano senza orologio.

Nessun `tsconfig` generato da Nuxt include `pipeline/`: il `tsconfig.json` della cartella va aggiunto ai `references` di quello radice, così `npm run typecheck` controlla anche la pipeline.

### Costanti (`config.ts`)

| Costante                | Valore                                                  |
| ----------------------- | ------------------------------------------------------- |
| `SUMMARY_MODEL`         | `inclusionai/ling-3.0-flash-vl`                         |
| `RETENTION_DAYS`        | `30`                                                    |
| `MAX_SUMMARIES_PER_RUN` | `40`                                                    |
| `MIN_SUMMARY_INPUT`     | `200` caratteri di testo semplice                       |
| `MAX_SUMMARY_INPUT`     | `4000` caratteri di testo semplice                      |
| `EXCERPT_LENGTH`        | circa `300` caratteri                                   |
| `FETCH_TIMEOUT_MS`      | `15000`                                                 |
| `USER_AGENT`            | `frontwire (+https://github.com/GioManara96/frontwire)` |

### Dipendenze nuove

In `devDependencies`, perché il sito non le usa:

- `feedsmith`: parser RSS/Atom con i namespace `media:` e `content:` (`rss-parser` è fermo al 2023).
- `sanitize-html` (+ `@types/sanitize-html`): funziona in Node senza DOM.
- `ai`: AI SDK 7; con una stringa `provider/model` passa da AI Gateway e legge `AI_GATEWAY_API_KEY` da solo.
- `tsx`: esegue TypeScript senza build.

## Flusso di un run

1. **Carica** `data/articles.json`.
2. **Scarica** tutte le fonti in parallelo. Una fonte che fallisce (timeout, stato HTTP, XML non valido) diventa un `::warning::` nell'Action e viene saltata. Il run fallisce solo se falliscono **tutte**.
3. **Normalizza** ogni voce in un `Article` candidato (regole sotto). Scarta le voci più vecchie della finestra, le release non stabili e quelle senza link, titolo o data validi.
4. **Unisce** con l'archivio:
   - un `id` già presente non si tocca mai: il record è immutabile, riassunto compreso;
   - lo stesso URL da due fonti produce lo stesso `id`: vince la prima fonte nell'ordine del registro.
5. **Riassume** (sezione successiva).
6. **Pota** gli articoli più vecchi di 30 giorni.
7. **Scrive** gli articoli dal più recente, con formattazione stabile (2 spazi, newline finale). Se niente è cambiato il file è identico byte per byte e l'Action non committa.

### Regole di normalizzazione

**Comuni**

- `id`: algoritmo della tappa 1 applicato all'URL (host minuscolo senza `www.`, niente frammento, niente `utm_*`/`ref`, parametri ordinati, niente `/` finale, primi 12 caratteri esadecimali dello SHA-256).
- `publishedAt`: la data della voce convertita in ISO 8601 UTC (`toISOString()`).
- `category` e `tags`: da registro più parole chiave (sotto).
- `coverImageUrl`: solo se il feed ne fornisce una (`media:content`, `media:thumbnail` o `enclosure` immagine) con URL assoluto `http(s)`. Nei feed verificati capita quasi solo con DeepMind: l'immagine sostitutiva della tappa 2 diventa il caso normale.
- Campi mancanti omessi, mai `null`.

**Blog (`rss`)**

- `url`: il `link` della voce.
- `excerpt`: testo semplice della descrizione (o di `content:encoded`), troncato a circa 300 caratteri su un confine di parola con `…`. Omesso se vuoto o uguale al titolo (il mirror Anthropic ripete il titolo nella descrizione).

**Release (`github-release`)**

- Il tag si legge dal link della voce (`…/releases/tag/<tag>`).
- **Stabile** se il tag è una versione semplice: `^v?\d+\.\d+(\.\d+)?$`. Così si scartano canary, beta e rc, e anche i tag spuri visti nei feed (`create-vite@9.2.1`, `dropped/page-tree-reuse`, `v6.0-rc`).
- `title`: `<project> <tag>`, per esempio `Nuxt v4.5.2`, `React v19.3.0`. Il titolo del feed si ignora perché ogni repo lo scrive a modo suo (`v4.5.2`, `19.3.0 (September 9, 2026)`, `TypeScript 7.0.2`).
- `publishedAt`: `published` se c'è, altrimenti `updated`.
- `contentHtml`: il contenuto della voce passato per `sanitize-html` con una allowlist ristretta (titoli, paragrafi, liste, link, `code`/`pre`, enfasi); via script, stili, attributi `on*` e immagini.
- `excerpt`: testo semplice di `contentHtml`, troncato come sopra.

### Tag da parole chiave (`assign-tags.ts`)

Ai tag di default si aggiungono quelli trovati nel titolo con regole per parola intera, senza distinzione di maiuscole: per esempio `Nuxt`, `Vue`, `React`, `Next.js`, `Vite`, `Svelte`/`SvelteKit`, `TypeScript`, `OpenAI`/`GPT`/`ChatGPT`, `Anthropic`/`Claude`, `DeepSeek`, `Hugging Face`, `Gemini`, `DeepMind`. Un tag compare una volta sola. La categoria resta quella della fonte. L'elenco preciso delle regole è nel piano.

## Riassunti

**Interfaccia.** `summarize.ts` espone una funzione che riceve titolo, nome della fonte e testo, e restituisce il riassunto. Dentro chiama `generateText` dell'AI SDK. Il modello è un parametro con default `SUMMARY_MODEL`: cambiare modello è una riga in `config.ts`, cambiare provider è una modifica a questo solo file, e i test passano un modello finto.

**Chi riceve un riassunto.** Ogni articolo **senza** `summary` il cui testo semplice (descrizione intera per i blog, `contentHtml` per le release) arriva ad almeno 200 caratteri. Si parte dai più recenti, massimo 40 per run. Un articolo saltato per il limite o per un errore riprova al run successivo, finché resta nella finestra. Quando un riassunto riesce, è definitivo.

Nei feed verificati le descrizioni dei blog sono di una riga (circa 90–130 caratteri) e la pipeline non legge le pagine degli articoli (niente scraping): in pratica i riassunti riguardano soprattutto le **release**, dove trasformano changelog da migliaia di caratteri in tre frasi. I post dei blog mostrano la descrizione dell'editore.

**Prompt.** Fisso, in inglese: 2–3 frasi, al massimo 60 parole, testo semplice senza markdown, solo fatti presenti nel testo, nessun tono promozionale, niente formule come "This article…". Il testo in ingresso è troncato a 4.000 caratteri.

**Validazione.** L'output si ripulisce (spazi, virgolette o markdown attorno). Vuoto o più lungo di 600 caratteri conta come fallimento.

**Errori.**

- Chiave `AI_GATEWAY_API_KEY` assente (run locale senza chiave): nessun riassunto, un warning, il run continua.
- Rate limit (`429`) dopo i retry dell'SDK: stop ai riassunti per questo run.
- Altri errori: l'articolo resta senza riassunto, si passa al successivo.

**Modello.** Si parte da `inclusionai/ling-3.0-flash-vl`, l'unico modello generalista nel free tier di AI Gateway (le varianti `-fin` e `-sante` sono specializzate in finanza e salute, `poolside/laguna-s-2.1` in codice). Il free tier vale solo per i modelli marcati `free` e ha rate limit più bassi. Il progetto non spende soldi: niente crediti a pagamento, niente modelli fuori dal free tier.

**Valutazione, prima di rifinire la feature.** Appena la normalizzazione produce testi veri, il piano prevede una versione minima di `summarize.ts` e un run locale con la chiave. Giovanni legge una decina di riassunti veri e controlla fedeltà al testo, lunghezza, inglese, niente markdown. Limite per run, retry, validazione e test di `summarize` arrivano solo se la valutazione passa, così un esito negativo non butta via lavoro.

**Se la valutazione non passa, la feature si elimina.** Niente passo 5 nel flusso, niente `summarize.ts`, niente dipendenza `ai`, niente chiave né secret. Il campo `summary` esce dal modello condiviso (`Article`) e da `getArticleText` (Giovanni); Claude aggiorna test e fixture che lo usano. Le card mostrano l'estratto dell'editore o, per le release, l'inizio delle note di rilascio.

## Workflow (`.github/workflows/ingest.yml`)

Lo scrive Giovanni. Forma attesa:

- **Trigger:** `schedule` con cron `17 */6 * * *` (ogni 6 ore, lontano dallo scoccare dell'ora, quando GitHub ritarda i run pianificati) e `workflow_dispatch` per il lancio manuale.
- **Permessi:** `contents: write`, nient'altro.
- **Concorrenza:** un gruppo `ingest` senza cancellazione, così due run non si sovrappongono.
- **Job** su `ubuntu-latest` con un timeout di 15 minuti:
  1. checkout;
  2. `actions/setup-node` con Node 24 e cache npm;
  3. `npm ci`;
  4. `npm run pipeline` con `AI_GATEWAY_API_KEY` dal secret;
  5. il test d'integrità dei dati (`test/unit/articles-data.test.ts`) come cancello: se il JSON non è valido l'Action diventa rossa e non committa;
  6. commit e push solo se `data/articles.json` è cambiato, come `github-actions[bot]`, messaggio `chore(data): update articles`.

Il push fatto con il `GITHUB_TOKEN` non avvia altri workflow. Il deploy Vercel partirà comunque, quando il progetto sarà collegato (fuori tappa): l'integrazione Git di Vercel reagisce a ogni push, non ai workflow.

**Secret.** Giovanni crea una chiave in Vercel (AI Gateway → API Keys) e la salva nel repo come `AI_GATEWAY_API_KEY` (Settings → Secrets and variables → Actions).

**Sviluppo e primo run.** Durante lo sviluppo la pipeline gira in locale con `npm run pipeline`. L'Action può girare solo quando il workflow è su `main`: il primo run manuale arriva dopo il merge `staging` → `main` di fine tappa, il primo da `init` in poi. I dati finti si eliminano nel primo run reale: si parte da un archivio vuoto, nello stesso commit che introduce il primo JSON vero.

Se il repo resta 60 giorni senza attività, GitHub sospende i workflow pianificati; si riattivano dalla tab Actions.

## Errori e casi limite

| Caso                                            | Comportamento                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Fonte che non risponde, timeout, XML non valido | Warning, fonte saltata; il run fallisce solo se falliscono tutte |
| Mirror Anthropic sparito                        | Come sopra                                                       |
| Voce senza link, titolo o data validi           | Scartata e contata nel log                                       |
| Release non stabile o tag spurio                | Scartata                                                         |
| Stesso URL da due fonti                         | Stesso `id`: vince la prima fonte nell'ordine del registro       |
| Articolo già in archivio                        | Non modificato                                                   |
| Descrizione uguale al titolo                    | `excerpt` omesso                                                 |
| Testo sotto i 200 caratteri                     | Nessun riassunto: la card mostra l'estratto o solo il titolo     |
| Chiave AI assente                               | Nessun riassunto, warning, run riuscito                          |
| Rate limit (`429`)                              | Stop ai riassunti per il run; ripresa al successivo              |
| Output del modello vuoto o troppo lungo         | Scartato; riprova al run successivo                              |
| Nessun articolo nuovo né scaduto                | File identico, nessun commit                                     |
| JSON prodotto non valido                        | Il test d'integrità fallisce, niente commit, Action rossa        |

## Test (Claude, Vitest, ambiente `node`)

Nessuna chiamata di rete. Le fixture stanno in `test/fixtures/feeds/` e sono ritagli di feed veri:

- RSS con descrizione breve (Next.js) e senza testo (Hugging Face);
- RSS con copertina `media:` (DeepMind);
- mirror Anthropic con descrizione uguale al titolo;
- Atom di release con versioni stabili, canary, beta e tag spuri (`create-vite@…`);
- un XML rotto.

Test unitari:

- `article-id`: ogni passo della normalizzazione dell'URL e l'hash;
- `html`: la sanitize toglie script, stili e `on*` e tiene l'allowlist; testo semplice; troncamento su confine di parola;
- `normalize`: voci RSS e release, titolo da tag, filtro delle stabili, regole di `excerpt` e copertina, scarti;
- `assign-tags`: tag di default, parole chiave, niente doppioni;
- `merge`: immutabilità dei record esistenti, ordine di vittoria tra fonti, finestra, ordinamento, output identico a parità di dati;
- `summarize`: modello finto dell'AI SDK; validazione dell'output, chiave assente, stop sul `429`, limite per run;
- `run`: fetch e riassunti finti; una fonte che fallisce produce un warning, tutte che falliscono producono un errore.

Il test d'integrità esistente resta com'è e diventa il cancello dell'Action.

## Documentazione

`CLAUDE.md`, concordato con Giovanni: architettura (AI Gateway al posto di GitHub Models, finestra di 30 giorni), fonti reali, nuova sezione "Pipeline (tappa 3)" con i file di `pipeline/`, flusso Git (il bot committa su `main`, `staging` si riallinea).

## Criteri di accettazione

- `npm run pipeline` in locale produce un `data/articles.json` reale che passa il test d'integrità.
- Un secondo run subito dopo lascia il file identico.
- Giovanni ha valutato una decina di riassunti: la feature è confermata con il modello gratuito, oppure è rimossa del tutto.
- `npm run lint`, `npm run typecheck` (che copre anche `pipeline/`) e `npm test` passano.
- Su `main`: il run manuale dell'Action è verde e il bot committa; poi partono i run pianificati.
- `CLAUDE.md` aggiornato.
