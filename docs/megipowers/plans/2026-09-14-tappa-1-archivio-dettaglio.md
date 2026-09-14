# Tappa 1 — Piano di lavoro

> **Chi esegue:** questo piano **non** va eseguito da agenti in autonomia. Il codice dell'app (`shared/`, `server/`, `app/`) lo scrive Giovanni; Claude si occupa di strumenti, dati finti, test, revisione dei commenti e documentazione (vedi `CLAUDE.md`). Ogni task indica il responsabile. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** archivio e pagina di dettaglio in HTML semplice, alimentati da dati finti, con modello dei dati tipizzato e test.

**Architettura:** tipi e costanti in `shared/`, dati in `data/articles.json`, due route Nitro che espongono lista e dettaglio con la logica in funzioni pure (`server/utils/`), due pagine che leggono le route con `useFetch`, generate staticamente con `nuxt generate`.

**Stack:** Nuxt 4.5, Vue 3, TypeScript strict, Vitest, ESLint (`@nuxt/eslint`), Prettier.

**Specifica:** `docs/megipowers/specs/2026-09-14-tappa-1-archivio-dettaglio-design.md`

---

## Come si lavora

- Tutta la tappa si svolge su un branch unico, `feat/archive-and-detail`, creato da `staging`. Si fa un commit per ogni task; a fine tappa Giovanni fa il merge in `staging`.
- **Le funzioni di utilità si sviluppano con i test scritti prima.** Claude scrive i test, che all'inizio falliscono; Giovanni implementa finché passano. I test fanno da specifica eseguibile: dicono con precisione cosa deve fare la funzione.
- A fine task di Giovanni, Claude fa la code review e riscrive i commenti secondo le regole di `CLAUDE.md`, toccando solo i commenti.
- **Import espliciti** in `shared/` e `server/utils/`: questi file devono importare esplicitamente (con percorsi relativi) tutto ciò che usano, invece di affidarsi agli auto-import di Nuxt, perché i test li caricano con Vitest, fuori da Nuxt. Negli handler di `server/api/` e nelle pagine gli auto-import vanno bene.
- I test (`test/`) non sono coperti dalle configurazioni TypeScript generate da Nuxt: l'editor li controlla in modo meno severo. Vitest ignora i tipi, quindi i test girano comunque. Si sistemerà se diventerà un fastidio.

## Mappa dei file

| File                                                                                                | Chi      | Responsabilità                                          |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- |
| `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, script in `package.json` | Claude   | Strumenti                                               |
| `shared/types/article.ts`                                                                           | Giovanni | `Category`, `Article`, `ArticleListItem`                |
| `shared/utils/tags.ts`                                                                              | Giovanni | `TagDefinition`, `TAGS`, `TagId`                        |
| `shared/utils/sources.ts`                                                                           | Giovanni | `SourceKind`, `SourceDefinition`, `SOURCES`, `SourceId` |
| `shared/utils/article-text.ts`                                                                      | Giovanni | `getArticleText`                                        |
| `shared/utils/format-date.ts`                                                                       | Giovanni | `formatDate`                                            |
| `server/utils/articles.ts`                                                                          | Giovanni | `listArticles`, `findArticle` (funzioni pure)           |
| `server/utils/article-data.ts`                                                                      | Giovanni | `getArticles`: accesso tipizzato al JSON                |
| `server/api/articles.get.ts`, `server/api/articles/[id].get.ts`                                     | Giovanni | Route                                                   |
| `app/app.vue`, `app/pages/index.vue`, `app/pages/articles/[id].vue`                                 | Giovanni | Pagine                                                  |
| `data/articles.json`                                                                                | Claude   | Dati finti                                              |
| `test/unit/*.test.ts`                                                                               | Claude   | Test                                                    |
| `vercel.json`                                                                                       | Claude   | Build statica su Vercel                                 |

---

### Task 1 — Strumenti · **Claude**

**File:** crea `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`; modifica `package.json`, `nuxt.config.ts` (lo modifica `nuxi`), `CLAUDE.md`.

- [x] **Passo 1: branch**

```bash
git switch -c feat/archive-and-detail staging
```

- [x] **Passo 2: installare ESLint per Nuxt**

```bash
npx nuxi module add eslint
```

Atteso: `@nuxt/eslint` ed `eslint` tra le dipendenze, `'@nuxt/eslint'` in `modules` di `nuxt.config.ts`.

- [x] **Passo 3: le altre dipendenze di sviluppo**

```bash
npm i -D prettier eslint-config-prettier vitest typescript vue-tsc
```

- [x] **Passo 4: `eslint.config.mjs`** (se `nuxi` l'ha già creato, sostituirne il contenuto)

```js
// @ts-check
import prettier from "eslint-config-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

// Prettier comes last so it switches off every rule that would fight the formatter.
export default withNuxt(prettier);
```

- [x] **Passo 5: Prettier**

`.prettierrc`:

```json
{
  "printWidth": 120
}
```

`.prettierignore` (Prettier 3 ignora già i file in `.gitignore`):

```
# Written by the import pipeline, not by hand.
data/
package-lock.json
```

- [x] **Passo 6: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

// Pin a zone far from UTC (+14h) so date code that silently depends on the machine's time zone fails loudly.
// Set before the config is returned: Vitest's worker processes inherit this environment.
process.env.TZ = "Pacific/Kiritimati";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

- [x] **Passo 7: script in `package.json`**

```json
"lint": "eslint .",
"format": "prettier --write .",
"format:check": "prettier --check .",
"test": "vitest run",
"typecheck": "nuxt typecheck"
```

- [x] **Passo 8: verifica**

```bash
npm run format && npm run lint && npm run typecheck && npm test -- --passWithNoTests
```

Atteso: nessun errore di lint o di tipi; Vitest esce con codice 0 e segnala che non ci sono ancora test.

- [x] **Passo 9: aggiornare `CLAUDE.md`**: nella sezione Stack i nuovi comandi prendono il posto della riga "Da configurare".

- [x] **Passo 10: commit**

```bash
git add -A && git commit -m "chore: set up eslint, prettier and vitest"
```

---

### Task 2 — Modello dei dati · **Giovanni**

**File:** crea `shared/types/article.ts`, `shared/utils/tags.ts`, `shared/utils/sources.ts`.

**Obiettivo:** tradurre in TypeScript le tabelle della specifica (sezione "Modello dei dati"). I nomi qui sotto sono vincolanti, perché test e dati li usano:

| Nome               | Cos'è                                              |
| ------------------ | -------------------------------------------------- |
| `TagDefinition`    | `{ label: string; icon: string }`                  |
| `TAGS`             | Oggetto costante con i 13 tag della specifica      |
| `TagId`            | Unione delle chiavi di `TAGS`                      |
| `SourceKind`       | `'rss' \| 'github-release' \| 'hn' \| 'devto'`     |
| `SourceDefinition` | `{ name: string; kind: SourceKind; icon: string }` |
| `SOURCES`          | Oggetto costante con le 4 fonti della specifica    |
| `SourceId`         | Unione delle chiavi di `SOURCES`                   |
| `Category`         | `'frontend' \| 'ai'`                               |
| `Article`          | I 12 campi della specifica, facoltativi con `?`    |
| `ArticleListItem`  | `Article` senza `contentHtml`                      |

**Suggerimenti:**

- `as const satisfies Record<string, TagDefinition>` fa due cose insieme: controlla la forma di ogni voce e conserva le chiavi letterali, che servono per ricavare `TagId` con `keyof typeof TAGS`.
- Per `ArticleListItem` c'è un tipo di utilità di TypeScript che toglie un campo da un tipo esistente.
- In `article.ts` importa `TagId` e `SourceId` con `import type` e percorso relativo.

**Criteri di accettazione:**

- [ ] `npm run typecheck` e `npm run lint` passano
- [ ] tag e fonti corrispondono esattamente alle tabelle della specifica
- [ ] commit: `feat(model): add article type, tag vocabulary and source registry`
- [ ] **Claude:** code review e riscrittura dei commenti

---

### Task 3 — Dati finti e test di integrità · **Claude**

**File:** crea `test/unit/articles-data.test.ts`, `data/articles.json`. Richiede il Task 2.

- [ ] **Passo 1: il test**

```ts
import { describe, expect, it } from "vitest";
import rawArticles from "../../data/articles.json";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";

// The data is validated here because TypeScript can't do it: imported JSON gets loose inferred types.
const articles = rawArticles as Array<Record<string, unknown>>;

const REQUIRED_FIELDS = ["id", "title", "url", "sourceId", "publishedAt", "category", "tags"];
const OPTIONAL_FIELDS = ["excerpt", "summary", "contentHtml", "discussionUrl", "coverImageUrl"];
const TEXT_FIELDS = ["excerpt", "summary", "contentHtml"];
const URL_FIELDS = ["url", "discussionUrl", "coverImageUrl"];
const CATEGORIES = ["frontend", "ai"];
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function sourceKind(article: Record<string, unknown>) {
  return SOURCES[article.sourceId as keyof typeof SOURCES]?.kind;
}

describe("data/articles.json", () => {
  it("contains at least one article", () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = articles.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(articles.map((article) => [String(article.id), article] as const))("article %s", (_id, article) => {
    it("has only known fields, and omits missing ones instead of using null", () => {
      for (const [key, value] of Object.entries(article)) {
        expect([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]).toContain(key);
        expect(value, `${key} must be omitted, not null`).not.toBeNull();
      }
    });

    it("has every required field", () => {
      for (const field of REQUIRED_FIELDS) expect(article).toHaveProperty(field);
    });

    it("has a 12-character hex id", () => {
      expect(article.id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("has a non-empty title", () => {
      expect(typeof article.title).toBe("string");
      expect((article.title as string).trim()).not.toBe("");
    });

    it("has a valid ISO 8601 UTC publication date", () => {
      expect(article.publishedAt).toMatch(ISO_UTC);
      expect(Number.isNaN(Date.parse(article.publishedAt as string))).toBe(false);
    });

    it("has a known category", () => {
      expect(CATEGORIES).toContain(article.category);
    });

    it("has at least one tag, all from the vocabulary, none repeated", () => {
      expect(Array.isArray(article.tags)).toBe(true);
      const tags = article.tags as unknown[];
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(Object.keys(TAGS)).toContain(tag);
      expect(new Set(tags).size).toBe(tags.length);
    });

    it("comes from a registered source", () => {
      expect(Object.keys(SOURCES)).toContain(article.sourceId);
    });

    it("uses absolute http(s) URLs", () => {
      for (const field of URL_FIELDS) {
        if (field in article) expect(isHttpUrl(article[field]), field).toBe(true);
      }
    });

    it("has no empty text fields", () => {
      for (const field of TEXT_FIELDS) {
        if (field in article) expect((article[field] as string).trim(), field).not.toBe("");
      }
    });

    it("has contentHtml only if it is a GitHub release", () => {
      if ("contentHtml" in article) expect(sourceKind(article)).toBe("github-release");
    });

    it("has discussionUrl only if it comes from Hacker News", () => {
      if ("discussionUrl" in article) expect(sourceKind(article)).toBe("hn");
    });
  });
});
```

- [ ] **Passo 2: verificare che fallisca**

Esegui: `npm test`. Atteso: FAIL, perché `data/articles.json` non esiste.

- [ ] **Passo 3: scrivere `data/articles.json`**

Dieci articoli basati su contenuti veri, recuperati al momento dalle fonti, che coprono i casi della specifica:

| #    | Fonte           | Caso                                                                                             |
| ---- | --------------- | ------------------------------------------------------------------------------------------------ |
| 1–2  | `nuxt-releases` | Release con `contentHtml` (HTML pulito: solo `p`, `h2`, `h3`, `ul`, `li`, `a`, `strong`, `code`) |
| 3–4  | `openai-news`   | Estratto, nessuna copertina; categoria `ai`                                                      |
| 5–6  | `devto`         | Copertina ed estratto; URL da `canonical_url`                                                    |
| 7–8  | `hackernews`    | `discussionUrl`, nessun testo                                                                    |
| 9–10 | uno qualsiasi   | Con `summary` (scritto a mano, in inglese)                                                       |

Gli `id` si calcolano con l'algoritmo della specifica, tramite uno script usa e getta nella scratchpad di Claude (non va nel repo):

```js
import { createHash } from "node:crypto";

const TRACKING_PARAM = /^(utm_.*|ref)$/;

export function articleId(raw) {
  const url = new URL(raw);
  url.hostname = url.hostname.replace(/^www\./, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return createHash("sha256").update(url.toString()).digest("hex").slice(0, 12);
}
```

- [ ] **Passo 4: verificare che passi**

Esegui: `npm test`. Atteso: PASS.

- [ ] **Passo 5: commit**

```bash
git add data/articles.json test/unit/articles-data.test.ts && git commit -m "test(data): add mock articles and data integrity test"
```

---

### Task 4 — Testo e data dell'articolo · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/article-text.test.ts`, `test/unit/format-date.test.ts` (Claude); `shared/utils/article-text.ts`, `shared/utils/format-date.ts` (Giovanni).

**Firme:**

- `getArticleText(article: Pick<Article, "summary" | "excerpt">): string | undefined`
- `formatDate(iso: string): string`

- [ ] **Passo 1 (Claude): i test**

`test/unit/article-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getArticleText } from "../../shared/utils/article-text";

describe("getArticleText", () => {
  it("prefers the AI summary over the feed excerpt", () => {
    expect(getArticleText({ summary: "Summary.", excerpt: "Excerpt." })).toBe("Summary.");
  });

  it("falls back to the excerpt when there is no summary", () => {
    expect(getArticleText({ excerpt: "Excerpt." })).toBe("Excerpt.");
  });

  it("returns undefined when the source provided no text", () => {
    expect(getArticleText({})).toBeUndefined();
  });
});
```

`test/unit/format-date.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDate } from "../../shared/utils/format-date";

describe("formatDate", () => {
  it("runs in a time zone far from UTC", () => {
    // Guard: vitest.config.ts pins TZ to UTC+14. Without it the tests below could pass by accident.
    expect(new Date("2026-09-14T12:00:00Z").getDate()).toBe(15);
  });

  it("formats as a short US English date", () => {
    expect(formatDate("2026-09-14T12:19:00Z")).toBe("Sep 14, 2026");
  });

  it("keeps the UTC calendar day just after midnight", () => {
    expect(formatDate("2026-09-14T00:00:00Z")).toBe("Sep 14, 2026");
  });

  it("keeps the UTC calendar day just before midnight", () => {
    expect(formatDate("2026-09-14T23:59:59Z")).toBe("Sep 14, 2026");
  });
});
```

- [ ] **Passo 2 (Claude): verificare che falliscano**

Esegui: `npm test`. Atteso: FAIL, perché i moduli non esistono. Il test di guardia sul fuso orario deve già passare.

- [ ] **Passo 3 (Giovanni): implementare le due funzioni**

Suggerimenti:

- `getArticleText` è una riga: c'è un operatore che sceglie il primo valore non `undefined`.
- `formatDate`: `Intl.DateTimeFormat` accetta la lingua e un'opzione `timeZone`. Il formato atteso (`Sep 14, 2026`) corrisponde a uno degli stili predefiniti per la data. Il formatter si può creare una sola volta, fuori dalla funzione.

- [ ] **Passo 4 (Giovanni): far passare i test**

Esegui: `npm test`. Atteso: PASS.

- [ ] **Passo 5 (Giovanni): commit**: `feat(utils): add article text and date formatting helpers`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 5 — Route server · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/articles.test.ts` (Claude); `server/utils/articles.ts`, `server/utils/article-data.ts`, `server/api/articles.get.ts`, `server/api/articles/[id].get.ts` (Giovanni).

**Firme:**

- `listArticles(articles: Article[]): ArticleListItem[]`: dal più recente al più vecchio, senza `contentHtml`, senza modificare l'array ricevuto.
- `findArticle(articles: Article[], id: string): Article | undefined`
- `getArticles(): Article[]`: il contenuto di `data/articles.json` con il tipo giusto. Il cast avviene qui e solo qui; è sicuro perché il test di integrità valida il file.

- [ ] **Passo 1 (Claude): i test**

`test/unit/articles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findArticle, listArticles } from "../../server/utils/articles";
import type { Article } from "../../shared/types/article";

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: "000000000000",
    title: "Title",
    url: "https://example.com/post",
    sourceId: "devto",
    publishedAt: "2026-09-01T00:00:00Z",
    category: "frontend",
    tags: ["vue"],
    ...overrides,
  };
}

const older = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-09-01T10:00:00Z" });
const newer = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-10T10:00:00Z", contentHtml: "<p>Notes</p>" });
const newest = makeArticle({ id: "cccccccccccc", publishedAt: "2026-09-14T10:00:00Z" });

describe("listArticles", () => {
  it("orders articles from newest to oldest", () => {
    const ids = listArticles([older, newest, newer]).map((article) => article.id);
    expect(ids).toEqual(["cccccccccccc", "bbbbbbbbbbbb", "aaaaaaaaaaaa"]);
  });

  it("leaves contentHtml out of every list item", () => {
    for (const item of listArticles([older, newest, newer])) expect(item).not.toHaveProperty("contentHtml");
  });

  it("does not reorder or modify the array it receives", () => {
    const input = [older, newest, newer];
    listArticles(input);
    expect(input).toEqual([older, newest, newer]);
    expect(newer.contentHtml).toBe("<p>Notes</p>");
  });
});

describe("findArticle", () => {
  it("returns the full article, contentHtml included", () => {
    expect(findArticle([older, newer], "bbbbbbbbbbbb")).toEqual(newer);
  });

  it("returns undefined for an unknown id", () => {
    expect(findArticle([older], "ffffffffffff")).toBeUndefined();
  });
});
```

- [ ] **Passo 2 (Claude): verificare che falliscano**

Esegui: `npm test`. Atteso: FAIL, perché `server/utils/articles.ts` non esiste.

- [ ] **Passo 3 (Giovanni): funzioni pure e accesso ai dati**

Suggerimenti:

- Attenzione a `Array.prototype.sort`: ordina l'array _sul posto_. Il terzo test esiste proprio per questo tranello.
- Le date ISO in UTC nello stesso formato si possono confrontare direttamente come stringhe.
- Per togliere un campo senza toccare l'oggetto originale, pensa al destructuring con rest.
- In `article-data.ts` il JSON si importa con l'alias `~~/data/articles.json` (`~~` è la radice del progetto).

- [ ] **Passo 4 (Giovanni): far passare i test**

Esegui: `npm test`. Atteso: PASS.

- [ ] **Passo 5 (Giovanni): gli handler**

`articles.get.ts` restituisce `listArticles(getArticles())`. `[id].get.ts` legge il parametro con `getRouterParam`, cerca con `findArticle` e, se non trova niente, lancia `createError` con `statusCode: 404`. Negli handler gli auto-import vanno bene.

- [ ] **Passo 6 (Giovanni): verifica manuale**

Con `npm run dev` attivo:

```bash
curl -s localhost:3000/api/articles | head -c 400
curl -si localhost:3000/api/articles/ffffffffffff | head -1
```

Atteso: lista in JSON dal più recente, senza `contentHtml`; `HTTP/1.1 404` per l'ID inesistente. Un ID reale preso da `data/articles.json` risponde 200 con l'articolo completo.

- [ ] **Passo 7 (Giovanni): commit**: `feat(api): add article list and detail routes`
- [ ] **Passo 8 (Claude): code review e riscrittura dei commenti**

---

### Task 6 — Pagine · **Giovanni**

**File:** modifica `app/app.vue`; crea `app/pages/index.vue`, `app/pages/articles/[id].vue`.

**Obiettivo:** le due pagine della specifica (sezione "Pagine"), in HTML semantico senza stile.

**Requisiti:**

- `app.vue` rende `<NuxtPage />` al posto di `<NuxtWelcome />`.
- **Archivio:** per ogni articolo copertina (`<img>` con `alt`) oppure riquadro segnaposto con il nome della fonte; titolo con `<NuxtLink>` al dettaglio; nome della fonte; data in un `<time datetime="…">`; categoria; tag come testo (`label` dal vocabolario); testo da `getArticleText`, con il blocco omesso quando non c'è testo. Messaggio quando la lista è vuota.
- **Dettaglio:** stessi dati; `contentHtml` con `v-html` solo quando presente; link "Read the original" con `target="_blank"` e `rel="noopener"`; link alla discussione quando presente. ID inesistente: errore bloccante 404.

**Suggerimenti:**

- `useFetch("/api/articles")` ricava il tipo della risposta direttamente dalla route Nitro: non serve dichiararlo a mano.
- Nella pagina di dettaglio l'ID arriva da `useRoute().params`. Se `useFetch` restituisce un errore, `createError({ statusCode: 404, fatal: true })` mostra la pagina di errore di Nuxt.
- Nome della fonte e label dei tag si leggono da `SOURCES` e `TAGS`, auto-importati nelle pagine.

**Criteri di accettazione** (con `npm run dev`):

- [ ] l'archivio mostra gli articoli dal più recente; ogni titolo porta al dettaglio
- [ ] gli articoli HN non hanno blocco di testo e hanno il link alla discussione
- [ ] il dettaglio di una release mostra le note di rilascio
- [ ] ricaricando direttamente una pagina di dettaglio, la console del browser non mostra avvisi di hydration
- [ ] `/articles/ffffffffffff` mostra la pagina 404
- [ ] `npm run lint` e `npm run typecheck` passano
- [ ] commit: `feat(pages): add archive and article detail pages`
- [ ] **Claude:** code review e riscrittura dei commenti

---

### Task 7 — Build statica per Vercel · **Claude**

**File:** crea `vercel.json`.

- [ ] **Passo 1: `vercel.json`** (come nel portfolio)

```json
{
  "buildCommand": "NITRO_PRESET=static nuxt generate",
  "outputDirectory": ".output/public",
  "framework": null
}
```

- [ ] **Passo 2: build locale**

```bash
NITRO_PRESET=static npx nuxt generate
ls .output/public/articles | wc -l
node -e "console.log(require('./data/articles.json').length)"
```

Atteso: build senza errori; i due numeri coincidono, cioè il crawler ha trovato una pagina di dettaglio per ogni articolo.

- [ ] **Passo 3: prova del sito statico**

```bash
npx serve .output/public
```

Atteso: archivio e dettaglio funzionano anche navigando senza server Nuxt.

- [ ] **Passo 4: commit**

```bash
git add vercel.json && git commit -m "chore: add vercel static build config"
```

---

### Task 8 — Chiusura · **Claude**, poi **Giovanni**

- [ ] **Claude:** verifica completa, tutto verde:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && NITRO_PRESET=static npx nuxt generate
```

- [ ] **Claude:** aggiornare `CLAUDE.md` con quanto esiste ora davvero (file principali del flusso dei dati, comandi) e committare: `docs: update CLAUDE.md after stage 1`
- [ ] **Giovanni:** merge di `feat/archive-and-detail` in `staging`
