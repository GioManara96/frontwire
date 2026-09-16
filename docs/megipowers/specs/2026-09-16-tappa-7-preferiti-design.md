# Tappa 7 — Preferiti

Data: 2026-09-16

## Obiettivo e confini

Mettere da parte gli articoli che interessano, in modo che restino leggibili anche dopo che sono usciti dall'archivio (finestra di 30 giorni, tetto di 3 per fonte).

**Dentro:** salvataggio nel browser dalla card e dal dettaglio; pagina `/favorites` con le stesse card dell'archivio; link nell'header con il numero dei salvati.

**Fuori:** account e database (il progetto non ha un server e non usa servizi a pagamento); esportazione o importazione dei preferiti; sincronizzazione fra dispositivi; filtri dentro la pagina dei preferiti; sincronizzazione fra schede aperte dello stesso browser.

## Cosa si salva

Una sola chiave in `localStorage`, `frontwire.favorites`, con un array JSON di articoli salvati.

Ogni voce porta tutto quello che serve a disegnare la card — `id`, `title`, `url`, `sourceId`, `publishedAt`, `category`, `tags`, e quando ci sono `excerpt`, `discussionUrl`, `coverImageUrl` — più `savedAt`, l'istante del salvataggio in ISO 8601 UTC. È una copia, non un riferimento: la pagina dei preferiti non legge `data/articles.json` e non cambia quando l'archivio cambia. Un articolo salvato resta identico per sempre, anche anni dopo che la fonte l'ha tolto dal feed.

Il prezzo della copia è che un articolo salvato non si aggiorna più: se la fonte corregge il titolo, il preferito tiene quello vecchio. Per un archivio di notizie è il comportamento giusto.

### L'ordine

Il salvataggio più recente sta in testa all'array, così la pagina lo legge già nell'ordine giusto senza riordinare. Salvare un articolo già salvato non crea un doppione e non cambia la posizione.

### Dati di cui non fidarsi

Il `localStorage` si modifica a mano dagli strumenti del browser, sopravvive ai rilasci e non è versionato con il codice: quello che si legge non è per forza quello che si è scritto. Alla lettura ogni voce passa da un controllo di forma e le voci che non lo superano si scartano in silenzio, tenendo le altre.

Il controllo non è formale: `sourceId` e `tags` sono chiavi di `SOURCES` e `TAGS`, e un valore inventato farebbe cercare alla card l'icona di una fonte che non esiste, cioè un errore in pagina. Quindi si verificano contro i vocabolari veri, come `parseFilters` fa già con la query.

Se l'intera stringa non è JSON valido, o non è un array, la lista riparte vuota: è l'unico modo per uscire da uno stato illeggibile senza bloccare la pagina.

## Il pulsante

Un segnalibro in **alto a destra sulla copertina** della card, sopra l'immagine o il segnaposto, sempre nello stesso punto qualunque sia la lunghezza del titolo. Lo stesso pulsante sta in testa alla pagina di dettaglio.

- `aria-pressed` dice lo stato; l'etichetta accessibile è "Save this article" / "Remove from saved".
- L'icona è piena quando l'articolo è salvato, vuota quando non lo è.
- Sta sopra il link che allarga la card (come i tag e il link alla discussione), così il clic salva e non apre l'articolo.

Il pulsante serve anche sugli articoli **senza pagina di dettaglio**, che sono metà dell'archivio: per questo sta sulla card e non solo nel dettaglio.

## La pagina `/favorites`

Stessa impaginazione dell'archivio: intestazione e griglia delle stesse `ArticleCard`.

- Titolo `h1`: "Saved articles". Sotto, il numero: "3 articles", oppure niente quando è vuota.
- **Vuota:** "Nothing saved yet." e un link all'archivio.
- **I tag** delle card qui non filtrano la pagina: portano all'archivio filtrato su quel tag (`/?tags=react`), come già fanno i tag nel dettaglio. Nella pagina dei preferiti nessun tag risulta attivo.
- Togliere il segnalibro fa sparire subito la card dalla lista, senza conferma. Il gesto è reversibile solo risalvando l'articolo dall'archivio, ma è lo stesso gesto che l'ha messo lì: chiedere conferma darebbe peso a un'azione che non ne ha.

### Rimuovere tutto

In testa alla pagina, quando c'è almeno un salvato, un pulsante "Remove all". Il primo clic non cancella: al suo posto compaiono "Remove all 3?" e "Keep them". A differenza di un singolo segnalibro, questo gesto non si può rifare: gli articoli già usciti dall'archivio non si ritrovano da nessuna parte.

### Accesso

Nell'header, accanto al link di GitHub, un segnalibro **nello stesso cerchio** del pulsante sulle copertine: sono la stessa cosa e devono somigliarsi. Il numero dei salvati sta appoggiato in alto a destra del cerchio, e compare solo dopo il montaggio e solo se è maggiore di zero: prima non c'è nulla da mostrare e uno zero a ogni caricamento sarebbe rumore.

**Da `md` in su l'header è fisso** in cima. Perché header e filtri insieme non tornino a pesare un quarto dello schermo, lì i filtri lasciano la barra orizzontale e diventano una **colonna a sinistra** larga 12rem, ferma sotto l'header mentre l'archivio scorre. Categorie e tag si impilano, i numeri si allineano a destra, e i pulsanti scendono da 44px a 32px: il bersaglio da pollice serve sul telefono, non col mouse. Così l'intero vocabolario (15 tag) sta in colonna senza scorrere su uno schermo da 900px; se un giorno non ci stesse, la colonna scorre per conto suo con la scrollbar nascosta, come la riga dei tag su mobile.

Le card si stringono da ~370px a ~291px a 1280: il prezzo della colonna, pagato volentieri per avere in cima gli articoli invece dei filtri.

`FilterBar` resta un solo componente con lo stesso markup: cambia solo il CSS.

**Su mobile no:** header (75px) e barra dei filtri (125px) insieme prenderebbero 200px su 844, un quarto dello schermo. Lì l'header scorre via e al suo posto compare un **pulsante flottante** in basso a destra, col numero: più comodo per il pollice della cima dello schermo. Compare solo quando l'header è uscito, quando c'è almeno un salvato e quando non si è già in `/favorites`.

## Stato e hydration

`localStorage` esiste solo nel browser. Il sito è prerenderizzato: il server non sa cosa c'è salvato, quindi l'HTML della build è quello di un utente senza preferiti.

Lo stato vive in un composable con `useState` di Nuxt, uno solo per tutta l'applicazione: header, archivio, dettaglio e pagina dei preferiti guardano la stessa lista e si aggiornano insieme. Il composable legge il `localStorage` **al montaggio** e lo riscrive a ogni cambio.

Fino al montaggio la lista è vuota, come già fa `useArticleFilters` con i filtri: leggere durante l'hydration farebbe divergere l'HTML del client da quello del server. La conseguenza visibile è che la pagina dei preferiti e il numero nell'header compaiono un istante dopo il caricamento. Sulla pagina `/favorites`, prerenderizzata vuota, questo si vede come uno stato vuoto che dura un attimo prima della lista.

Niente sincronizzazione fra schede (l'evento `storage`): due schede aperte contemporaneamente non è un caso che capita nell'uso reale del sito, e sarebbe codice che nessuno esercita. Si aggiunge se un giorno dà fastidio.

## I pezzi

- `app/utils/favorites.ts` — logica pura, importata per percorso relativo e senza auto-import di Nuxt, come `article-filters.ts`: il tipo `SavedArticle`, la conversione da articolo a salvato, lettura e scrittura della stringa JSON con la validazione, aggiunta, rimozione, verifica di appartenenza.
- `app/composables/useFavorites.ts` — lo stato condiviso e il dialogo con il `localStorage`. Espone la lista, il numero, `isSaved(id)` e `toggle(article)`.
- `app/components/FavoriteButton.vue` — il segnalibro, usato dalla card e dal dettaglio.
- `app/app.vue` — il link nell'header e il pulsante flottante di mobile, con l'ascolto dello scroll.
- `app/pages/favorites.vue` — la pagina.
- `app/components/ArticleCard.vue`, `app/pages/articles/[id].vue`, `app/app.vue` — il pulsante e il link nell'header.

La separazione è la stessa delle altre tappe: la logica che si può provare senza browser sta nelle utils, il resto è sottile.

## Test

Vitest su `app/utils/favorites.ts`, come per i filtri; composable e componenti restano fuori.

- Una voce valida si rilegge identica; i campi opzionali assenti restano assenti.
- Una voce con `sourceId` o un tag fuori vocabolario si scarta, le altre restano.
- Una voce senza i campi obbligatori, o con un campo del tipo sbagliato, si scarta.
- Una stringa che non è JSON, o un JSON che non è un array, dà lista vuota.
- Salvare mette in testa; risalvare lo stesso articolo non duplica e non sposta.
- Rimuovere toglie solo quell'id e lascia l'ordine degli altri.
