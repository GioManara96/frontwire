# Tappa 5 — Filtri e rifiniture

Data: 2026-09-15

## Obiettivo e confini

Rendere l'archivio navigabile ora che ha dati veri (34 articoli, 15 tag, 2 categorie) e togliere dal dettaglio le incongruenze emerse con le fonti della tappa 4.

**Dentro:** intestazione dell'archivio; barra dei filtri per categoria e tag, con i filtri nell'URL; tag cliccabili nelle card e nel dettaglio; card degli articoli senza testo che aprono direttamente l'originale; dettaglio senza doppioni e con un avviso sulla fonte che dice il vero.

**Fuori:** card compatte senza segnaposto (proposte, non scelte da Giovanni), preferiti, progetto Vercel e sottodominio.

## Cosa ha mostrato l'archivio vero

Screenshot del 2026-09-15 a 390px e 1280px, con i 34 articoli della tappa 4:

- Metà degli articoli (HN e newsletter, 17 su 34) non ha estratto: il dettaglio mostra solo titolo, tag e due pulsanti, un clic in più verso l'originale.
- Nel dettaglio delle release l'estratto ripete l'inizio delle note complete, che stanno subito sotto.
- L'avviso "Frontwire only shows an excerpt" è falso per le release (note complete) e per gli articoli senza testo.
- Il titolo "Articles" non dice cos'è il sito né quanto è fresco.

## Intestazione dell'archivio

Al posto di "Articles":

- titolo `h1`: "Web development and AI news for developers";
- sotto, in mono come le meta: "Updated <data>", la data della build statica. Ogni commit del bot su `main` fa ripartire il deploy, quindi la build coincide con l'ultimo import. La data si fissa in `nuxt.config.ts` (`runtimeConfig.public.builtAt`) al momento della build e si formatta con `formatDate`.

## Barra dei filtri

Sotto l'intestazione, **fissa in cima** mentre la pagina scorre (`position: sticky`, sfondo pieno e bordo inferiore).

- **Riga 1, categoria:** tre pulsanti `All`, `Frontend`, `AI`. Uno solo attivo; `All` toglie il filtro di categoria.
- **Riga 2, tag:** un pulsante per ogni tag presente nell'archivio, con icona, label e numero di articoli (`React 6`). Ordine: dal più frequente; a parità, ordine del vocabolario. I tag senza articoli non compaiono. Più tag attivi insieme.
- **Su mobile** la riga dei tag non va a capo: scorre in orizzontale, senza scrollbar visibile. Da `md` in su va a capo.
- **`Clear`** compare quando c'è almeno un filtro attivo e li toglie tutti.
- **Combinazione:** categoria **e** (almeno uno dei tag attivi). Il numero accanto a ogni tag conta gli articoli dell'intero archivio, non quelli filtrati: così non cambia sotto il dito.
- **Nessun risultato:** "No articles match these filters." con il pulsante per azzerare.

### Filtri nell'URL

Lo stato vive nella query della home: `/?category=ai&tags=react,vue`.

- `category`: `frontend` o `ai`; qualsiasi altro valore si ignora.
- `tags`: id del vocabolario separati da virgole; quelli sconosciuti e i doppioni si ignorano. Nell'URL i tag seguono l'ordine del vocabolario, così lo stesso filtro dà sempre lo stesso URL.
- Ogni cambio di filtro è una nuova voce della cronologia: il tasto indietro torna al filtro precedente. Un URL senza filtri è `/`.

**Limite della build statica:** la home prerenderizzata contiene l'archivio completo, perché la query non esiste al momento della build. I filtri si applicano dopo il montaggio del componente, quindi aprendo direttamente un link filtrato si vede per un attimo l'archivio intero. Navigando dentro il sito non succede. Applicarli durante l'hydration farebbe divergere l'HTML del server da quello del client.

## Tag nelle card e nel dettaglio

- **Nelle card** ogni tag è un pulsante che attiva o disattiva quel tag nella barra (`aria-pressed`, `title` "Filter by React"). Un tag attivo ha il bordo e il testo in accento, come nella barra.
- **Nel dettaglio** ogni tag è un link a `/?tags=<tag>`: l'archivio filtrato su quel tag solo.
- La card resta cliccabile per intero (il link del titolo si allarga sulla card); tag e link "Discussion" stanno sopra quel livello, così il clic su di loro non apre l'articolo.

## Card senza testo

Una card **apre il dettaglio solo se l'articolo ha un estratto**. Le release con note hanno sempre un estratto, ricavato dalle note. Senza estratto (HN, newsletter, release senza note) il titolo porta direttamente all'originale, in una nuova scheda (`target="_blank"`, `rel="noopener"`), con l'icona di link esterno accanto al titolo.

- Le storie HN hanno in più, nella card, il link "Discussion" alla pagina di HN.
- Gli articoli senza estratto non hanno più una pagina di dettaglio: il crawler di `nuxt generate` segue i link, e nessun link porta lì. La route resta: se un giorno servisse, basta un link.

## Dettaglio

- **Release:** l'estratto non si mostra quando c'è `contentHtml`: le note complete lo contengono già.
- **Avviso sulla fonte**, secondo il caso:
  - con note di rilascio: "Release notes from <fonte>, shown in full.";
  - con estratto: "Originally published on <fonte>. Frontwire only shows an excerpt — read the full piece at the source.";
  - senza testo (raggiungibile solo da URL diretto): "Originally published on <fonte>."
- Tag come link filtrati (sopra); il resto invariato.

## Struttura

| File                                   | Responsabilità                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/utils/article-filters.ts`         | Logica pura: lettura e scrittura della query, filtro, conteggio dei tag, attiva/disattiva un tag, se una card apre l'originale |
| `app/composables/useArticleFilters.ts` | Stato dei filtri legato alla route: filtri correnti, azioni che navigano, `ready` dopo il montaggio                            |
| `app/components/FilterBar.vue`         | La barra                                                                                                                       |
| `app/components/ArticleCard.vue`       | La card, estratta da `index.vue` per tenere la view leggera                                                                    |
| `app/pages/index.vue`                  | Intestazione, barra, griglia filtrata, stato vuoto                                                                             |
| `app/pages/articles/[id].vue`          | Avviso per caso, niente estratto doppio, tag come link                                                                         |
| `app/assets/css/main.css`              | Classi semantiche di intestazione, barra, pulsanti filtro, stato attivo                                                        |
| `nuxt.config.ts`                       | `runtimeConfig.public.builtAt`                                                                                                 |

`app/utils/article-filters.ts` non usa auto-import di Nuxt: importa `shared/` con percorsi relativi, così Vitest lo carica fuori da Nuxt.

## Accessibilità

- Filtri e tag sono `<button>` con `aria-pressed`; la barra è un `<nav aria-label="Filters">`.
- Si usa da tastiera: la riga che scorre segue il focus.
- Il numero dei tag si legge anche per lo screen reader ("React, 6 articles").
- Focus visibile e aree tattili di almeno 44px di altezza sui pulsanti della barra.
- `prefers-reduced-motion`: niente transizioni, come oggi.

## Test

- `test/unit/article-filters.test.ts` (Vitest, ambiente `node`): parse della query (valori validi, sconosciuti, doppioni, array), query dai filtri (ordine del vocabolario, chiavi vuote omesse), filtro (categoria, un tag, più tag in o, categoria e tag insieme, nessun filtro), conteggio (ordine per frequenza e poi vocabolario, niente tag a zero), toggle, scelta tra dettaglio e originale.
- Markup e CSS: verifica con screenshot a 390px e 1280px della home, di una home filtrata e dei dettagli (release, articolo con estratto).

## Criteri di accettazione

- La home mostra intestazione, barra e griglia; cliccare categoria o tag filtra la griglia e cambia l'URL; indietro torna al filtro precedente; `Clear` azzera.
- I tag nelle card filtrano senza aprire l'articolo; i tag del dettaglio portano all'archivio filtrato.
- Le card senza estratto aprono l'originale; le storie HN mostrano "Discussion".
- Il dettaglio delle release non ripete l'estratto; l'avviso sulla fonte è corretto per ogni caso.
- Tutto usabile a 390px; la barra scorre senza allargare la pagina.
- `npm run lint`, `npm run format:check`, `npm run typecheck` e `npm test` passano; `nuxt generate` produce il sito.
