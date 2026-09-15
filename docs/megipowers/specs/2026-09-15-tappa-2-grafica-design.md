# Tappa 2 — Grafica

Data: 2026-09-15

## Obiettivo e confini

Vestire archivio e dettaglio, oggi HTML nudo, con un'identità visiva coerente con i progetti fratelli (portfolio ed echoes), scura e **mobile-first**. Nessuna nuova funzionalità: stesse pagine, stessi dati, stesse route.

**Dentro:** stack CSS (Tailwind v4, icone, font), design token (palette, tipografia, spaziature), classi semantiche, restyle di archivio e dettaglio, icone di tag e fonti, immagine sostitutiva della copertina, favicon e meta social, pagina di errore 404.

**Fuori (tappe successive):** barra dei filtri, preferiti, pipeline di importazione, collegamento del progetto Vercel e del sottodominio.

## Chi fa cosa

- **Giovanni:** il codice dell'app: `nuxt.config.ts`, `app/`, il CSS e i template.
- **Claude:** questa spec, l'aggiornamento di `CLAUDE.md`, la revisione dei commenti in code review. I test dei componenti restano fuori tappa (in tappa 1 non se ne sono scritti).

## Direzione visiva

Frontwire è un aggregatore di notizie: lista e dettaglio, come echoes, non un "IDE" come il portfolio. La famiglia visiva è quella di **echoes**: carbonio scuro, tipografia editoriale, classi semantiche composte con `@apply`, layout mobile-first con un container centrale. L'accento è però tutto suo, così frontwire si distingue dai fratelli.

Riferimenti d'impaginazione: il feed a card di dev.to e github.blog. Da evitare il registro "gaming/neon" dei template play-to-earn.

## Stack aggiunto

Allineato al portfolio, che monta già lo stesso ecosistema.

- **Tailwind CSS v4** via `@tailwindcss/vite` (plugin Vite, niente `tailwind.config`). Import in un unico CSS globale registrato in `nuxt.config.ts` (`css: ['~/assets/css/main.css']`).
- **`@nuxt/icon`** per Iconify. Collezioni installate come dipendenze, così le icone sono disponibili offline e nella build statica:
  - `@iconify-json/simple-icons` (loghi di tag e fonti)
  - `@iconify-json/material-symbols-light` (icona `release` e icone d'interfaccia)
- **`@nuxt/fonts`** per i font self-hosted (nessuna chiamata a Google in produzione; funziona con `nuxt generate`).

Niente Nuxt UI, coerente con `CLAUDE.md`.

## Design token (`app/assets/css/main.css`)

I token vivono in un blocco `@theme`, come nel portfolio e in echoes. I nomi sono semantici, non "il colore che è": `surface`, non `gray-800`.

### Palette

Base carbonio ereditata da echoes, accento proprio di frontwire.

| Token                | Valore    | Uso                                             |
| -------------------- | --------- | ----------------------------------------------- |
| `--color-bg`         | `#12161c` | Sfondo pagina                                   |
| `--color-surface`    | `#1a2028` | Card, blocchi, riquadro segnaposto              |
| `--color-border`     | `#2a313c` | Bordi e divisori                                |
| `--color-text`       | `#eceef2` | Testo principale                                |
| `--color-muted`      | `#8a93a0` | Meta: data, fonte, categoria                    |
| `--color-accent`     | `#b8e83a` | Link, tag attivo, hover, dettagli "live"        |
| `--color-accent-ink` | `#12161c` | Testo sopra l'accento (contrasto su fondo lime) |

Note:

- L'accento `#b8e83a` è un verde-lime "segnale" (il nome è _wire_): lane libera rispetto all'arancio di echoes e al teal/blu del portfolio.
- Su lime pieno il testo va scuro (`--color-accent-ink`): il lime chiaro non regge testo bianco. Usare l'accento soprattutto per bordi, testo-accento e stati, non come grande superficie con testo sopra.
- Verificare i contrasti AA: `text` su `bg`, `muted` su `bg`, `accent` su `bg`, `accent-ink` su `accent`.

### Tipografia

Trio di echoes, self-hosted via `@nuxt/fonts`.

| Token            | Famiglia                | Uso                                              |
| ---------------- | ----------------------- | ------------------------------------------------ |
| `--font-display` | Syne (700/800)          | Titoli: `h1` del dettaglio, titoli delle card    |
| `--font-body`    | Source Sans 3 (400/600) | Testo corrente, riassunti, estratti              |
| `--font-mono`    | IBM Plex Mono (400)     | Meta in maiuscoletto: data, categoria, etichette |

Regole: line-height comodo per il corpo, `text-pretty` sui paragrafi, lunghezza di riga sotto gli 80 caratteri sul dettaglio. Le meta in mono maiuscolo con un filo di `letter-spacing`, come le status di echoes.

## Layout

Mobile-first: si parte da una colonna e si aggiungono colonne ai breakpoint.

- **Container** `.page`: larghezza piena con padding laterale su mobile, `max-width` centrata da tablet in su (riferimento echoes: ~`992px` md, ~`1200px` xl). Padding verticale generoso.
- **Header** minimale: nome del sito (link alla home) e, più avanti, la barra dei filtri (fuori tappa). Per ora basta il titolo del sito.
- **Archivio**: griglia di card. Una colonna su mobile, due da `md`, tre da `xl`. Gap uniforme.
- **Dettaglio**: colonna singola centrata, larghezza di lettura contenuta.

## Componenti

### Card dell'articolo (archivio)

Ogni card mostra, dall'alto:

- **Copertura**: `coverImageUrl` in un `<img>` con `alt` (il titolo), `aspect-ratio` fisso e `object-fit: cover`. Se manca, **immagine sostitutiva**: riquadro `surface` con l'icona della fonte (da `SOURCES[sourceId].icon`) centrata e, sotto, il nome della fonte. È il posto dove le icone rimpiazzano il segnaposto testuale della tappa 1.
- **Meta** in mono: nome della fonte con la sua icona, data (`<time :datetime>` con `formatDate`), categoria.
- **Titolo** in `display`, link al dettaglio (l'intera card è cliccabile; il titolo resta un vero link per l'accessibilità).
- **Tag**: pill piccole. In tappa 1 erano testo; ora ognuna mostra l'icona (`TAGS[id].icon`) e la `label`. La `label` resta come `aria-label`/`title` quando l'icona è sola.
- **Testo**: `getArticleText` troncato a poche righe (`line-clamp`). Se non c'è testo (link HN), il blocco è omesso.

Hover: il bordo passa ad `accent`, come le card di echoes.

### Pagina di dettaglio

- **Copertura** (se presente) a piena larghezza del container, stesso trattamento della card.
- **Meta** in mono: fonte con icona, data, categoria.
- **Titolo** `h1` in `display`.
- **Tag** come nell'archivio.
- **Testo**: `getArticleText` per intero (non troncato).
- **`contentHtml`** (solo release) reso con `v-html`, dentro un blocco con stili "prose" semantici: `h2`/`h3`, `p`, `ul`/`li`, `a` (accento), `code`, `strong`. Riferimento: il prose di echoes/portfolio. È l'unico posto con `v-html`, già annotato per ESLint.
- **Azioni**: "Read the original" come pulsante-accento (`target="_blank"`, `rel="noopener"`); "Discussion" quando c'è `discussionUrl`.
- **Ritorno**: link "Back to articles".

### Icone

- Tag e fonti hanno già i nomi Iconify in `TAGS` e `SOURCES`: la grafica li consuma, non li ridefinisce.
- Componente `<Icon>` di `@nuxt/icon`. Dare sempre una dimensione esplicita e un'etichetta accessibile quando l'icona porta significato da sola.

## Favicon e meta social

Coerenti con la famiglia (il portfolio ha `favicon.ico`, `apple-touch-icon.png`, `og.png`). Asset da produrre (Giovanni), poi registrati in `nuxt.config.ts` (`app.head`):

- `favicon.ico` (già presente in `public/`, da rifare in linea con l'identità)
- `apple-touch-icon.png` (180×180)
- `og.png` per le anteprime social (title + accento su fondo carbonio)
- `<meta>` di base: `title`, `description`, `og:*`, `twitter:card`

L'identità del marchio (logo/wordmark "frontwire") è una scelta di Giovanni; la spec fissa solo dove va e in che formati.

## Accessibilità e mobile

- **Mobile-first davvero**: ogni regola parte dalla colonna singola; i breakpoint aggiungono, non correggono.
- Contrasti AA verificati (vedi Palette).
- Aree tattili adeguate sui link e sulle card (min ~44px).
- `alt` sulle copertine; `aria-label`/`title` sulle icone sole.
- `prefers-reduced-motion`: le eventuali transizioni (hover dei bordi) si spengono, come nel portfolio.
- Focus visibile su link e card.

## Stile del codice (da `CLAUDE.md`)

- Niente liste chilometriche di classi nel template: **classi semantiche** in CSS composte con `@apply`. In Tailwind v4, i file CSS separati che usano utility hanno bisogno di `@reference` verso il CSS principale.
- Nei template gli elementi non si spezzano su più righe.
- La logica riusabile o con stato va in composable/utils, non nelle view.

## Errori e casi limite

| Caso                    | Comportamento                                                          |
| ----------------------- | ---------------------------------------------------------------------- |
| Copertina assente       | Immagine sostitutiva: icona + nome della fonte                         |
| Immagine che non carica | Gestione `onerror` verso il segnaposto (da valutare in fase di codice) |
| Nessun testo (link HN)  | Blocco testo omesso, card più corta                                    |
| Titolo molto lungo      | `line-clamp` sul titolo della card                                     |
| `contentHtml` lungo     | Scorre nel flusso della pagina; nessun height fisso                    |
| Lista vuota             | Messaggio "No articles yet." già presente, da vestire                  |
| 404                     | Pagina di errore vestita con gli stessi token                          |

## Test

In tappa 1 non si sono scritti test sui componenti e questa tappa non ne introduce di obbligatori: è quasi tutta CSS e markup, dove i test unitari rendono poco. La logica pura (testo, data, route) è già coperta. Se emergesse logica di presentazione non banale (es. scelta della copertina/segnaposto in un util), Claude aggiungerà un test mirato in quel punto.

## Criteri di accettazione

- Archivio e dettaglio vestiti con i token della spec; identità coerente con echoes, accento proprio.
- Mobile-first: tutto usabile e ordinato a 360px di larghezza; la griglia cresce ai breakpoint.
- Icone di tag e fonti visibili; copertina o segnaposto sempre presenti.
- `contentHtml` delle release leggibile (prose).
- Favicon e meta social in linea con la famiglia.
- `npm run lint`, `npm run typecheck` e `npm test` passano; `nuxt generate` produce il sito statico senza errori.
