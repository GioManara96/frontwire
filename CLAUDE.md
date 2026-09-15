# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Frontwire

Web app che raccoglie le notizie più interessanti sul web development, con focus su **frontend** (Nuxt, Next, Vue, React, Vite…) e **AI** (nuovi modelli e novità di Anthropic, OpenAI, DeepSeek…). Uso personale e caso studio per il portfolio di Giovanni, pubblicata su un sottodominio di `giovannimanara.dev` (probabilmente `frontwire.giovannimanara.dev`).

## Ruolo di Claude

**Il codice lo scrive Claude** (dal 2026-09-15, su richiesta di Giovanni, che non ha più tempo per seguirlo passo passo). Claude porta a termine il lavoro richiesto: codice, test, commenti, documentazione e commit sul branch del task.

- Niente modalità "mentore" (esercizi, suggerimenti, test da far passare a Giovanni) se Giovanni non la chiede espressamente.
- Le scelte di prodotto e di infrastruttura si discutono prima di ogni tappa, con spec e piano in `docs/megipowers/`.
- Le azioni verso l'esterno (push, merge in `staging` o `main`, lancio dei workflow) solo con il via di Giovanni.

## Lingua

**Tutto rigorosamente in inglese**: codice (nomi compresi), commenti, test, messaggi di commit e testi dell'interfaccia. È coerente con le fonti, che sono in inglese.

## Prodotto

- **Archivio** degli articoli con label e barra di filtri in alto.
- **Dettaglio articolo**: estratto della fonte e link all'originale. Mai ripubblicare l'articolo intero (diritti d'autore); eccezione le note di rilascio di GitHub, che si possono mostrare complete. Niente riassunti AI (vedi [Architettura](#architettura)).
- **Preferiti** salvati in `localStorage`, niente account né database. Il `localStorage` esiste solo nel browser: va letto lato client per evitare errori di hydration. Salvare anche titolo e URL, non solo l'ID, così il preferito sopravvive se l'articolo esce dall'archivio.

## Architettura

Niente database e niente server: il sito è statico e i dati vivono nel repo. Il progetto non usa servizi a pagamento.

1. Una **GitHub Action pianificata** (`.github/workflows/ingest.yml`, ogni 6 ore) scarica le fonti, normalizza gli articoli, rimuove i duplicati e assegna le label.
2. Gli articoli sono salvati come **JSON nel repo** (`data/articles.json`) e l'Action fa commit su `main`. L'archivio è fatto per essere letto per intero: al massimo **3 articoli per fonte**, i più recenti, entro gli **ultimi 30 giorni** (una ventina in tutto); da OpenAI entrano solo i post con categoria Product o Research.
3. Il push su `main` fa partire il deploy statico su **Vercel** (piano Hobby; progetto ancora da collegare).

Niente riassunti AI: GitHub Models, il provider previsto, è stato ritirato il 2026-07-30, e con i feed reali quasi nessun articolo ha abbastanza testo da riassumere (i blog portano una descrizione di una riga e non si fa scraping). Il ragionamento completo è nella spec della tappa 3.

Il tipo `Article`, il vocabolario dei tag e il registro delle fonti vivono in `shared/`: sono l'unica fonte di verità, comune ad app e pipeline. Il design di ogni tappa è in `docs/megipowers/specs/`.

### Flusso dei dati (tappa 1)

- `shared/types/article.ts`: `Article`, `ArticleListItem`, `Category`.
- `shared/utils/tags.ts`, `shared/utils/sources.ts`: vocabolari `TAGS` e `SOURCES` con i tipi `TagId`/`SourceId`/`FeedSourceId`.
- `shared/utils/format-date.ts`: data in UTC.
- `data/articles.json`: gli articoli, scritti dalla pipeline.
- `server/utils/articles.ts`: `getArticles` (unico cast del JSON), `listArticles`, `findArticle` (funzioni pure).
- `server/api/articles.get.ts`, `server/api/articles/[id].get.ts`: le due route.
- `app/pages/index.vue`, `app/pages/articles/[id].vue`: archivio e dettaglio, che leggono le route con `useFetch`.

### Grafica (tappa 2)

- `app/assets/css/main.css`: import di Tailwind, i design token in `@theme` (palette carbonio, accento lime `#b8e83a`, font Syne/Source Sans 3/IBM Plex Mono) e le classi semantiche composte con `@apply`.
- `app/app.vue`, `app/error.vue`: header del sito e pagina di errore.
- Le icone di tag e fonti arrivano da `@nuxt/icon` usando i nomi Iconify già in `TAGS`/`SOURCES`; i font sono self-hosted da `@nuxt/fonts`.
- Stack e token seguono `docs/megipowers/specs/2026-09-15-tappa-2-grafica-design.md`.

### Pipeline (tappa 3)

Script TypeScript in `pipeline/`, eseguiti con `tsx`; importano `shared/` con percorsi relativi, senza auto-import di Nuxt. Regole di normalizzazione e casi limite: `docs/megipowers/specs/2026-09-15-tappa-3-pipeline-design.md`.

- `pipeline/run.ts` (`npm run pipeline`): punto d'ingresso; legge e riscrive `data/articles.json`, stampa warning ed errori come annotazioni dell'Action.
- `pipeline/pipeline.ts`: `runPipeline`, un run completo con la funzione di fetch ricevuta da fuori, così si testa senza rete.
- `pipeline/normalize.ts`: feed di una fonte → `Article`. Si appoggia a `article-id.ts` (id dall'URL normalizzato), `html.ts` (sanitize delle note di rilascio, testo semplice, troncamento), `assign-tags.ts` (tag da parole chiave nel titolo).
- `pipeline/merge.ts`: unione con l'archivio (i record esistenti non cambiano mai), finestra di 30 giorni, tetto di 3 articoli per fonte, ordinamento stabile.
- Se cambiano i filtri di una fonte (per esempio `feedCategories`), gli articoli già importati restano finché escono per età o per il tetto. Per applicare subito le nuove regole, rigenerare da archivio vuoto: `echo '[]' > data/articles.json && npm run pipeline`.
- `pipeline/config.ts`, `pipeline/fetch-feed.ts`: costanti e rete.
- `pipeline/tsconfig.json`: referenziato dal `tsconfig.json` radice, così `npm run typecheck` controlla anche la pipeline.
- Test in `test/unit/pipeline/` con fixture in `test/fixtures/feeds/`. Il test d'integrità `test/unit/articles-data.test.ts` fa anche da cancello nell'Action: se fallisce, niente commit.

### Fonti

Solo **RSS/Atom e API ufficiali, niente scraping.** Il registro è `SOURCES` in `shared/utils/sources.ts`: l'ordine delle chiavi decide quale fonte tiene un articolo che arriva da due fonti.

- Blog: Nuxt, Next.js, React, Vite, Svelte, TypeScript, OpenAI (solo le categorie Product e Research), Hugging Face, Google DeepMind, Anthropic. Anthropic non ha un feed ufficiale: si usa un mirror della community, che è una dipendenza esterna e può sparire.
- GitHub Releases, solo le versioni stabili, di Nuxt, Vue, Next.js, React, Vite e TypeScript, tramite il feed Atom pubblico `github.com/<owner>/<repo>/releases.atom`.
- Prossima tappa: Hacker News tramite l'API Algolia, filtrando per parole chiave e punteggio minimo; dev.to tramite API, filtrando per tag.
- Esclusi per ora: il blog di Vue (fermo dal 2024), Vercel e le release di Claude Code (troppe voci, sommergerebbero il resto).

Verificare che ogni feed esista e risponda prima di aggiungerlo.

## Stack

Nuxt 4 (sorgenti in `app/`), Vue 3, TypeScript `strict`, Tailwind CSS v4 con `@nuxt/icon` (Iconify) e `@nuxt/fonts` (niente Nuxt UI per ora), deploy statico su Vercel. npm è il package manager (`package-lock.json` versionato). La pipeline usa `tsx`, `feedsmith` e `sanitize-html`.

```bash
npm install        # esegue anche `nuxt prepare`, che genera .nuxt/
npm run dev        # http://localhost:3000
npm run generate   # build statica, quella usata in produzione
npm run preview    # anteprima locale della build
npm run pipeline   # importa gli articoli in data/articles.json
npm run lint
npm run format
npm run format:check
npm run test
npm run typecheck
```

ESLint (`@nuxt/eslint`), Prettier (`printWidth: 120`) e Vitest (ambiente `node`) sono configurati.

`tsconfig.json` rimanda ai file generati in `.nuxt/` e a `pipeline/tsconfig.json`: se i tipi sembrano rotti, eseguire `npx nuxt prepare`.

Deploy da configurare come nel portfolio (`~/Programmi/personali/portfolio/vercel.json`): `NITRO_PRESET=static nuxt generate` con output `.output/public`. DNS del dominio su Cloudflare (CNAME verso Vercel).

## Stile del codice

- Indentazione a 2 spazi, mai tab.
- Nei template non spezzare gli elementi su più righe: tag e attributi restano insieme.
- Tailwind semantico: niente liste di classi chilometriche nel template, ma classi semantiche in CSS composte con `@apply` (Tailwind v4: nei file CSS separati serve `@reference`).
- View leggere: la logica riusabile o con stato va nei composable o nelle utils.

### Commenti

Si segue _A Philosophy of Software Design_ (Ousterhout): il commento registra ciò che era nella mente di chi ha progettato il codice e che il codice da solo non può esprimere. Le regole valgono per tutto il codice, anche quello scritto da Claude.

- **Non ripetere il codice.** Se il commento si può scrivere guardando la riga accanto, non serve. Non riusare le parole del nome che si commenta.
- **Commenti d'interfaccia** (TSDoc su funzioni, composable e tipi esportati): descrivono l'astrazione, cioè cosa deve sapere chi la usa: comportamento, significato di argomenti e valore di ritorno, effetti collaterali, errori, precondizioni. Niente dettagli d'implementazione. I tipi TypeScript dicono la forma, il commento dice il significato: formati, unità, casi limite, cosa vuol dire `null`.
- **Commenti d'implementazione**: dicono _cosa_ fa un blocco e _perché_, non _come_. Prima di un blocco o di un ciclo non ovvio, una frase che ne riassume l'intento.
- **Precisione e intuizione**: i commenti di livello basso aggiungono precisione (limiti inclusi o esclusi, invarianti), quelli di livello alto danno il quadro generale.
- **Decisioni trasversali** a più moduli (per esempio lo schema dell'articolo condiviso tra pipeline e app): documentate in un solo punto e richiamate dagli altri.
- **Aggiornarli insieme al codice**: un commento superato è peggio di nessun commento. Le spiegazioni stanno nel codice, non nei messaggi di commit.

Da evitare in particolare i "red flag" del libro: commento che ripete il codice, dettagli d'implementazione nel commento d'interfaccia. Se un commento d'interfaccia viene difficile da scrivere o lungo, è un indizio che l'astrazione va ripensata.

## Test

Li scrive Claude con Vitest. La priorità è la logica pura della pipeline (parsing dei feed, normalizzazione, deduplica, assegnazione delle label), dove i test costano poco e rendono molto. I feed usati nei test sono fixture locali, mai chiamate di rete.

## Git

- `main` = produzione, deploy automatico su Vercel. `staging` = ramo di integrazione.
- Il bot dell'Action committa `data/articles.json` direttamente su `main`: prima di aprire un nuovo branch, riallineare `staging` con un merge di `main`.
- Un branch per task a partire da `staging` (`feat/…`, `fix/…`).
- Commit convenzionali: `feat`, `fix`, `hotfix` (fix rapidi), `style` (design/CSS), `docs`, `test`, `chore`…
