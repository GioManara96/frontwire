# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Frontwire

Web app che raccoglie le notizie più interessanti sul web development, con focus su **frontend** (Nuxt, Next, Vue, React, Vite…) e **AI** (nuovi modelli e novità di Anthropic, OpenAI, DeepSeek…). Uso personale e caso studio per il portfolio di Giovanni, pubblicata su un sottodominio di `giovannimanara.dev` (probabilmente `frontwire.giovannimanara.dev`).

## Ruolo di Claude

**Il codice dell'app lo scrive Giovanni.** Il supporto di Claude riguarda:

- infrastruttura e scelte tecniche, discusse prima di ogni tappa
- sblocco quando Giovanni si incastra: spiegare il problema e indicare la strada
- code review del codice scritto da Giovanni

Niente Edit/Write sul codice dell'app se Giovanni non lo chiede esplicitamente. Brevi snippet illustrativi in chat vanno bene. Eccezioni, dove Claude scrive direttamente:

- **Commenti**: Giovanni li scrive a modo suo; in code review Claude li riscrive, aggiunge o rimuove secondo le regole della sezione [Commenti](#commenti). In quel passaggio si toccano solo i commenti, mai il codice.
- **Test**: li scrive e li mantiene Claude (sezione [Test](#test)).
- **Documentazione**: `docs/` e questo file li mantiene Claude.

## Lingua

**Tutto rigorosamente in inglese**: codice (nomi compresi), commenti, test, messaggi di commit, testi dell'interfaccia e riassunti AI degli articoli. È coerente con le fonti, che sono in inglese.

## Prodotto

- **Archivio** degli articoli con label e barra di filtri in alto.
- **Dettaglio articolo**: riassunto e link alla fonte originale. Mai ripubblicare l'articolo intero (diritti d'autore); eccezione le note di rilascio di GitHub, che si possono mostrare complete.
- **Preferiti** salvati in `localStorage`, niente account né database. Il `localStorage` esiste solo nel browser: va letto lato client per evitare errori di hydration. Salvare anche titolo e URL, non solo l'ID, così il preferito sopravvive se l'articolo esce dall'archivio.

## Architettura

Niente database e niente server: il sito è statico e i dati vivono nel repo.

1. Una **GitHub Action pianificata** scarica le fonti, normalizza gli articoli, rimuove i duplicati e assegna le label.
2. Per ogni articolo nuovo genera **una volta sola** un riassunto AI con **GitHub Models** (token dell'Action, nessun account extra). Se la chiamata fallisce si usa l'estratto del feed. Il provider AI resta isolato dietro una piccola interfaccia, così cambiarlo è una modifica locale.
3. Gli articoli sono salvati come **JSON nel repo** e l'Action fa commit.
4. Il push fa partire il deploy statico su **Vercel** (piano Hobby).

Lo schema dell'articolo è condiviso tra pipeline e app: è la fonte di verità, tenerlo tipizzato in un solo punto.

### Fonti

Solo **RSS/Atom e API ufficiali, niente scraping.**

- Blog e changelog via RSS (Nuxt, Vue, Next.js, React, Vite, Vercel, OpenAI, Hugging Face…).
- GitHub Releases tramite il feed Atom pubblico: `github.com/<owner>/<repo>/releases.atom`.
- Hacker News tramite l'API Algolia, filtrando per parole chiave e punteggio minimo; dev.to tramite API, filtrando per tag.
- Anthropic non ha un feed RSS ufficiale: esistono solo mirror della community, che sono una dipendenza esterna.

Verificare che ogni feed esista e risponda prima di aggiungerlo.

## Stack

Nuxt 4 (sorgenti in `app/`), Vue 3, TypeScript `strict`, Tailwind CSS v4 (niente Nuxt UI per ora), deploy statico su Vercel. npm è il package manager (`package-lock.json` versionato).

```bash
npm install        # esegue anche `nuxt prepare`, che genera .nuxt/
npm run dev        # http://localhost:3000
npm run generate   # build statica, quella usata in produzione
npm run preview    # anteprima locale della build
```

Da configurare, non ancora installati: ESLint con `@nuxt/eslint`, Prettier con `printWidth: 120`, Vitest. Aggiungere qui i comandi quando esistono.

`tsconfig.json` rimanda ai file generati in `.nuxt/`: se i tipi sembrano rotti, eseguire `npx nuxt prepare`.

Deploy da configurare come nel portfolio (`~/Programmi/personali/portfolio/vercel.json`): `NITRO_PRESET=static nuxt generate` con output `.output/public`. DNS del dominio su Cloudflare (CNAME verso Vercel).

## Stile del codice

- Indentazione a 2 spazi, mai tab.
- Nei template non spezzare gli elementi su più righe: tag e attributi restano insieme.
- Tailwind semantico: niente liste di classi chilometriche nel template, ma classi semantiche in CSS composte con `@apply` (Tailwind v4: nei file CSS separati serve `@reference`).
- View leggere: la logica riusabile o con stato va nei composable o nelle utils.

### Commenti

Si segue *A Philosophy of Software Design* (Ousterhout): il commento registra ciò che era nella mente di chi ha progettato il codice e che il codice da solo non può esprimere. Claude applica queste regole in code review, riscrivendo i commenti di Giovanni.

- **Non ripetere il codice.** Se il commento si può scrivere guardando la riga accanto, non serve. Non riusare le parole del nome che si commenta.
- **Commenti d'interfaccia** (TSDoc su funzioni, composable e tipi esportati): descrivono l'astrazione, cioè cosa deve sapere chi la usa: comportamento, significato di argomenti e valore di ritorno, effetti collaterali, errori, precondizioni. Niente dettagli d'implementazione. I tipi TypeScript dicono la forma, il commento dice il significato: formati, unità, casi limite, cosa vuol dire `null`.
- **Commenti d'implementazione**: dicono *cosa* fa un blocco e *perché*, non *come*. Prima di un blocco o di un ciclo non ovvio, una frase che ne riassume l'intento.
- **Precisione e intuizione**: i commenti di livello basso aggiungono precisione (limiti inclusi o esclusi, invarianti), quelli di livello alto danno il quadro generale.
- **Decisioni trasversali** a più moduli (per esempio lo schema dell'articolo condiviso tra pipeline e app): documentate in un solo punto e richiamate dagli altri.
- **Aggiornarli insieme al codice**: un commento superato è peggio di nessun commento. Le spiegazioni stanno nel codice, non nei messaggi di commit.

Nella review Claude corregge in particolare i "red flag" del libro: commento che ripete il codice, dettagli d'implementazione nel commento d'interfaccia. Se un commento d'interfaccia viene difficile da scrivere o lungo, Claude lo segnala a Giovanni: è un indizio che l'astrazione va ripensata.

## Test

Li scrive Claude con Vitest. La priorità è la logica pura della pipeline (parsing dei feed, normalizzazione, deduplica, assegnazione delle label), dove i test costano poco e rendono molto. I feed usati nei test sono fixture locali, mai chiamate di rete.

## Git

- `main` = produzione, deploy automatico su Vercel. `staging` = ramo di integrazione.
- Un branch per task a partire da `staging` (`feat/…`, `fix/…`).
- Commit convenzionali: `feat`, `fix`, `hotfix` (fix rapidi), `style` (design/CSS), `docs`, `test`, `chore`…
