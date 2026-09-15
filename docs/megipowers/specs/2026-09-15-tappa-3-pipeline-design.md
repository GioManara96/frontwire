# Tappa 3 — Pipeline di importazione

Data: 2026-09-15

## Obiettivo e confini

Sostituire i dati finti con articoli veri. Una GitHub Action pianificata legge i feed, normalizza le voci, elimina i duplicati, assegna i tag, scrive `data/articles.json` e fa commit su `main`. L'app legge lo stesso file con le stesse funzioni di `server/utils/articles.ts`.

**Dentro:** registro delle fonti esteso, adapter RSS/Atom (che copre anche le GitHub Releases), normalizzazione e `id`, deduplica, tag, finestra di 30 giorni, rimozione del campo `summary`, workflow dell'Action, fixture e test, primo merge `staging` → `main` che attiva l'Action.

**Fuori (tappe successive):** Hacker News e dev.to (tappa breve subito dopo, a pipeline già in funzione), rifiniture grafiche (tappa a sé, sui dati veri), barra dei filtri, preferiti, progetto Vercel e sottodominio.

## Decisioni che cambiano `CLAUDE.md`

- **Niente riassunti AI.** GitHub Models, il provider previsto, non esiste più: la documentazione GitHub dice che dal 30 luglio 2026 "the playground, model catalog, inference API, and bring your own key (BYOK) are no longer available to any customer" (l'endpoint `models.github.ai` risponde `410`). L'unica alternativa gratuita valutata (il free tier di Vercel AI Gateway) avrebbe riassunto pochissimo: i feed dei blog portano una descrizione di una riga e la pipeline non legge le pagine (niente scraping), quindi resterebbero le sole release con note lunghe, circa 3–5 al mese nella prova sui feed reali, che nel dettaglio mostrano già le note complete. Il progetto non spende soldi, quindi la funzione esce dal prodotto: il campo `summary` lascia `Article` e le card mostrano l'estratto della fonte.
- **Finestra di 30 giorni.** L'archivio tiene solo gli articoli pubblicati negli ultimi 30 giorni; la stessa regola limita il primo import (OpenAI ha 1.193 voci nel feed). I preferiti sopravvivono perché salvano titolo e URL.
- **I dati vivono su `main`.** I workflow pianificati girano sempre sul branch di default, quindi l'Action committa su `main`. `staging` si riallinea con un merge di `main` prima di aprire un nuovo branch; dopo questa tappa `data/` lo scrive solo il bot, quindi i conflitti sono improbabili.

## Chi fa cosa

- **Giovanni:** il codice in `pipeline/`; `shared/utils/sources.ts`, `shared/utils/tags.ts` e `shared/types/article.ts`; le pagine che oggi usano `getArticleText`; il workflow YAML; l'installazione delle librerie della pipeline.
- **Claude:** questa spec e il piano; strumenti (`tsconfig` della pipeline, script npm); fixture, test e dati finti; l'aggiornamento di `CLAUDE.md` (concordato con Giovanni); la revisione dei commenti in code review.

## Fonti (v1)

Solo feed verificati il 2026-09-15 (tutti rispondono `200`). Il feed del blog di Vue è fermo a marzo 2024, quindi Vue entra solo con le release. Vercel (circa 100 voci al mese, blog e changelog mescolati) e le release di Claude Code (quasi quotidiane) restano fuori per non sommergere il resto.

Una prova con l'implementazione di riferimento sui feed reali, lo stesso giorno, ha prodotto 112 articoli nella finestra senza errori; OpenAI News da sola ne porta 63.

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

Le fonti con un feed (`rss` e `github-release`) aggiungono ai campi attuali:

- `feedUrl`: l'indirizzo del feed.
- `category`: la categoria di tutti i loro articoli.
- `tags`: i tag di default, almeno uno (il test d'integrità richiede almeno un tag per articolo).
- `project`: solo per `github-release`, il prefisso del titolo.

L'ordine delle chiavi è quello delle tabelle, con `devto` e `hackernews` in fondo: conta, perché quando due fonti portano lo stesso URL vince la prima. `devto` e `hackernews` restano come sono, senza feed: la pipeline li salta fino alla tappa successiva, che deciderà anche categoria e tag dei loro articoli. Come esprimere nei tipi TypeScript che questi campi esistono solo per certi `kind` (unione discriminata o altro) lo decide Giovanni.

### Vocabolario (`shared/utils/tags.ts`)

Nuovo tag `deepmind` (label "DeepMind", icona `simple-icons:deepmind`, presente nella collezione installata).

## Struttura

Script TypeScript in `pipeline/`, eseguiti con `tsx` (`npm run pipeline` = `tsx pipeline/run.ts`). Importano `shared/` con percorsi relativi, come fa già `server/utils/articles.ts`: il modello resta uno solo per app e pipeline.

| File             | Responsabilità                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `run.ts`         | Punto d'ingresso: legge e scrive il JSON, stampa riepilogo e annotazioni dell'Action, exit code |
| `pipeline.ts`    | Orchestra un run: scarica le fonti, normalizza, unisce; riceve la funzione di fetch da fuori    |
| `config.ts`      | Costanti: finestra, lunghezza dell'estratto, timeout, user-agent                                |
| `fetch-feed.ts`  | Scarica un feed con timeout e user-agent; restituisce il testo o un errore                      |
| `normalize.ts`   | Feed di una fonte → `Article` candidati, più il numero di voci scartate                         |
| `article-id.ts`  | Algoritmo dell'`id` fissato in tappa 1                                                          |
| `html.ts`        | Sanitize di `contentHtml`, HTML → testo semplice, troncamento dell'estratto                     |
| `assign-tags.ts` | Tag di default della fonte più quelli ricavati da parole chiave nel titolo                      |
| `merge.ts`       | Unione con l'archivio, deduplica, finestra di 30 giorni, ordinamento                            |
| `tsconfig.json`  | `strict`, include `pipeline/**` e `shared/**`                                                   |

Tutto tranne `run.ts` e `fetch-feed.ts` è testabile senza rete né file: le funzioni ricevono dati e restituiscono dati, `pipeline.ts` riceve il fetch come parametro e l'istante "adesso" è sempre un parametro, così finestra e date si testano senza orologio.

Nessun `tsconfig` generato da Nuxt include `pipeline/`: il `tsconfig.json` della cartella va aggiunto ai `references` di quello radice, così `npm run typecheck` controlla anche la pipeline (verificato: `nuxt typecheck` segue il riferimento e segnala gli errori in `pipeline/`).

### Costanti (`config.ts`)

| Costante           | Valore                                                  |
| ------------------ | ------------------------------------------------------- |
| `RETENTION_DAYS`   | `30`                                                    |
| `EXCERPT_LENGTH`   | `300` caratteri, ellissi compresa                       |
| `FETCH_TIMEOUT_MS` | `15000`                                                 |
| `USER_AGENT`       | `frontwire (+https://github.com/GioManara96/frontwire)` |

### Dipendenze nuove

In `devDependencies`, perché il sito non le usa:

- `feedsmith`: parser RSS/Atom con i namespace `media:` e `content:` (`rss-parser` è fermo al 2023).
- `sanitize-html` (+ `@types/sanitize-html`): funziona in Node senza DOM.
- `tsx`: esegue TypeScript senza build.
- `@types/node`: oggi arriva solo come dipendenza indiretta; la pipeline usa `node:fs` e `node:crypto`.

## Flusso di un run

1. **Carica** `data/articles.json`.
2. **Scarica** tutte le fonti con feed, in parallelo. Una fonte che fallisce (timeout, stato HTTP, XML non valido) diventa un `::warning::` nell'Action e viene saltata. Il run fallisce solo se falliscono **tutte**.
3. **Normalizza** ogni voce in un `Article` candidato (regole sotto). Scarta le voci più vecchie della finestra, le release non stabili e quelle senza link, titolo o data validi.
4. **Unisce** con l'archivio:
   - un `id` già presente non si tocca mai: il record è immutabile;
   - lo stesso URL da due fonti produce lo stesso `id`: vince la prima fonte nell'ordine del registro.
5. **Pota** gli articoli più vecchi di 30 giorni.
6. **Scrive** gli articoli dal più recente (a parità di data, per `id`), con formattazione stabile (2 spazi, newline finale). Se niente è cambiato il file è identico byte per byte e l'Action non committa.

### Regole di normalizzazione

**Comuni**

- `id`: algoritmo della tappa 1 applicato all'URL (host minuscolo senza `www.`, niente frammento, niente `utm_*`/`ref`, parametri ordinati, niente `/` finale, primi 12 caratteri esadecimali dello SHA-256).
- `publishedAt`: la data della voce convertita in ISO 8601 UTC (`toISOString()`).
- `category` e `tags`: da registro più parole chiave (sotto).
- `excerpt`: testo semplice (tag tolti, entità decodificate, spazi compattati), troncato a 300 caratteri al massimo su un confine di parola, con `…` e senza punteggiatura lasciata a penzolare. Omesso se vuoto o uguale al titolo (il mirror Anthropic ripete il titolo nella descrizione).
- Campi mancanti omessi, mai `null`.

**Blog (`rss`)**

- `url`: il `link` della voce, solo se è un URL assoluto `http(s)`.
- `excerpt`: dalla descrizione o, se manca, da `content:encoded`.
- `coverImageUrl`: solo se il feed ne fornisce una con URL assoluto `http(s)`, in quest'ordine: immagine di `media:content`, `media:thumbnail`, `enclosure` di tipo immagine. Nei feed verificati capita quasi solo con DeepMind: l'immagine sostitutiva della tappa 2 diventa il caso normale.

**Release (`github-release`)**

- Il tag si legge dal link della voce (`…/releases/tag/<tag>`, decodificato).
- **Stabile** se il tag è una versione semplice: `^v?\d+\.\d+(\.\d+)?$`. Così si scartano canary, beta e rc, e anche i tag spuri visti nei feed (`create-vite@9.2.1`, `dropped/page-tree-reuse`, `v6.0-rc`).
- `title`: `<project> <tag>`, per esempio `Nuxt v4.5.2`, `React v19.3.0`. Il titolo del feed si ignora perché ogni repo lo scrive a modo suo (`v4.5.2`, `19.3.0 (September 9, 2026)`, `TypeScript 7.0.2`).
- `publishedAt`: `published` se c'è, altrimenti `updated`.
- `contentHtml`: il contenuto della voce passato per `sanitize-html` con una allowlist ristretta (titoli, paragrafi, liste, citazioni, link con il solo `href` e schemi `http`/`https`/`mailto`, `code`/`pre`, enfasi); via script e stili con il loro contenuto, tutti gli altri attributi e le immagini. Omesso se vuoto.
- `excerpt`: dal testo semplice di `contentHtml`.
- Nessuna copertina: l'unico `media:thumbnail` dei feed di GitHub è l'avatar di chi pubblica.

### Tag da parole chiave (`assign-tags.ts`)

Ai tag di default si aggiungono, in ordine di vocabolario, quelli trovati nel titolo con regole per parola intera e senza distinzione di maiuscole: `Nuxt`; `Vue`/`Vue.js`; `React`; `Next.js`; `Vite`; `Svelte`/`SvelteKit`; `TypeScript`; `OpenAI`/`ChatGPT`/`GPT-<cifra>` (anche con il trattino non separabile che usa OpenAI); `Anthropic`/`Claude`; `DeepSeek`; `Hugging Face`/`HuggingFace`; `Gemini`; `DeepMind`. Un tag compare una volta sola. La categoria resta quella della fonte.

## Rimozione di `summary`

- `Article` perde `summary` (e il suo commento).
- `getArticleText` (`shared/utils/article-text.ts`) sceglieva tra riassunto ed estratto: senza riassunto non serve più. Il file si elimina e le pagine usano `excerpt` direttamente.
- Claude toglie `summary` dai dati finti e dal test d'integrità, ed elimina il test di `getArticleText`.

## Workflow (`.github/workflows/ingest.yml`)

Lo scrive Giovanni. Forma attesa:

- **Trigger:** `schedule` con cron `17 */6 * * *` (ogni 6 ore, lontano dallo scoccare dell'ora, quando GitHub ritarda i run pianificati) e `workflow_dispatch` per il lancio manuale.
- **Permessi:** `contents: write`, nient'altro.
- **Concorrenza:** un gruppo `ingest` senza cancellazione, così due run non si sovrappongono.
- **Job** su `ubuntu-latest` con un timeout di 15 minuti:
  1. `actions/checkout@v7`;
  2. `actions/setup-node@v7` con Node 24 e cache npm;
  3. `npm ci`;
  4. `npm run pipeline`;
  5. il test d'integrità dei dati (`test/unit/articles-data.test.ts`) come cancello: se il JSON non è valido l'Action diventa rossa e non committa;
  6. commit e push solo se `data/articles.json` è cambiato, come `github-actions[bot]`, messaggio `chore(data): update articles`.

Il push fatto con il `GITHUB_TOKEN` non avvia altri workflow. Il deploy Vercel partirà comunque, quando il progetto sarà collegato (fuori tappa): l'integrazione Git di Vercel reagisce a ogni push, non ai workflow.

**Sviluppo e primo run.** Durante lo sviluppo la pipeline gira in locale con `npm run pipeline`. L'Action può girare solo quando il workflow è su `main`: il primo run manuale arriva dopo il merge `staging` → `main` di fine tappa, il primo da `init` in poi. I dati finti si eliminano nel primo run reale in locale: si parte da un archivio vuoto, nello stesso commit che introduce il primo JSON vero.

Se il repo resta 60 giorni senza attività, GitHub sospende i workflow pianificati; si riattivano dalla tab Actions.

## Errori e casi limite

| Caso                                            | Comportamento                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Fonte che non risponde, timeout, XML non valido | Warning, fonte saltata; il run fallisce solo se falliscono tutte |
| Mirror Anthropic sparito                        | Come sopra                                                       |
| Feed di un formato diverso da quello atteso     | Come sopra (una fonte `rss` che risponde con Atom, o viceversa)  |
| Voce senza link assoluto, titolo o data validi  | Scartata e contata nel riepilogo                                 |
| Release non stabile o tag spurio                | Scartata                                                         |
| Stesso URL da due fonti                         | Stesso `id`: vince la prima fonte nell'ordine del registro       |
| Articolo già in archivio                        | Non modificato                                                   |
| Descrizione vuota o uguale al titolo            | `excerpt` omesso: la card mostra solo il titolo                  |
| Nessun articolo nuovo né scaduto                | File identico, nessun commit                                     |
| JSON prodotto non valido                        | Il test d'integrità fallisce, niente commit, Action rossa        |

## Test (Claude, Vitest, ambiente `node`)

Nessuna chiamata di rete. Le fixture stanno in `test/fixtures/feeds/` e riproducono le forme dei feed veri:

- RSS con descrizioni brevi e lunghe, `content:encoded`, voci senza testo, con descrizione uguale al titolo, senza link, con link relativo, con data non valida o fuori finestra;
- RSS con copertine `media:` ed `enclosure` in tutte le varianti;
- Atom di release con versioni stabili, canary, beta, rc e tag spuri, un avatar e una release senza note;
- un XML rotto.

Test unitari:

- `sources`: il registro corrisponde alle tabelle di questa spec (ordine compreso); le icone di fonti e tag esistono nelle collezioni Iconify installate;
- `article-id`: ogni passo della normalizzazione dell'URL e l'hash;
- `html`: la sanitize toglie script, stili, attributi, link `javascript:` e immagini e tiene l'allowlist; testo semplice; troncamento;
- `assign-tags`: tag di default, parole chiave, ordine, niente doppioni;
- `merge`: immutabilità dei record esistenti, ordine di vittoria tra fonti, finestra, ordinamento, output identico a parità di dati;
- `normalize`: voci RSS e release, titolo da tag, filtro delle stabili, regole di `excerpt` e copertina, scarti, formato sbagliato;
- `pipeline`: fetch finto; conteggi, immutabilità, deduplica tra fonti, una fonte che fallisce produce un warning, tutte che falliscono producono un errore.

Il test d'integrità esistente perde `summary` e diventa il cancello dell'Action. Prima di finire nel piano, i test sono stati eseguiti su un'implementazione di riferimento (fuori dal repo) e passano; la stessa implementazione sui feed reali produce un JSON che supera il test d'integrità.

## Documentazione

`CLAUDE.md`, concordato con Giovanni: prodotto (il dettaglio mostra l'estratto, niente riassunti AI), architettura (niente GitHub Models né provider AI, finestra di 30 giorni, i dati su `main`), fonti reali, nuova sezione "Pipeline (tappa 3)" con i file di `pipeline/`, flusso Git (il bot committa su `main`, `staging` si riallinea).

## Criteri di accettazione

- `npm run pipeline` in locale produce un `data/articles.json` reale che passa il test d'integrità.
- Un secondo run subito dopo lascia il file identico.
- Nessuna traccia di `summary` e `getArticleText` nel codice.
- `npm run lint`, `npm run format:check`, `npm run typecheck` (che copre anche `pipeline/`) e `npm test` passano; `nuxt generate` produce il sito con i dati veri.
- Su `main`: il run manuale dell'Action è verde e il bot committa; poi partono i run pianificati.
- `CLAUDE.md` aggiornato.
