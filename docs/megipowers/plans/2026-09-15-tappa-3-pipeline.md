# Tappa 3 — Piano di lavoro

> **Chi esegue:** questo piano **non** va eseguito da agenti in autonomia. Il codice della pipeline, del modello e delle pagine lo scrive Giovanni; Claude si occupa di strumenti, fixture, test, dati finti, revisione dei commenti e documentazione (vedi `CLAUDE.md`). Ogni task indica il responsabile. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** una GitHub Action che ogni 6 ore importa gli articoli veri da 16 feed RSS/Atom in `data/articles.json`, al posto dei dati finti.

**Architettura:** script TypeScript in `pipeline/` eseguiti con `tsx`. Moduli piccoli e puri (id, HTML, tag, unione, normalizzazione) orchestrati da `runPipeline`, che riceve il fetch da fuori; `run.ts` fa solo I/O. Il modello resta in `shared/`, unico per app e pipeline. Il workflow committa su `main`.

**Stack:** Node 24, TypeScript strict, `tsx`, `feedsmith`, `sanitize-html`, Vitest, GitHub Actions.

**Specifica:** `docs/megipowers/specs/2026-09-15-tappa-3-pipeline-design.md`

---

## Come si lavora

- Tutta la tappa si svolge su un branch unico, `feat/import-pipeline`, creato da `staging`. Si fa un commit per ogni task; a fine tappa il merge va in `staging` e poi in `main`, dove l'Action può girare.
- **Test prima del codice.** Claude scrive i test, che all'inizio falliscono; Giovanni implementa finché passano. I test fanno da specifica eseguibile. Sono già stati eseguiti su un'implementazione di riferimento fuori dal repo (108 test verdi, typecheck strict pulito, e sui feed reali un JSON che supera il test d'integrità): se un test sembra sbagliato, prima di cambiarlo se ne parla.
- **Nomi e firme sono vincolanti**: i test li importano. Il resto (strutture interne, nomi locali, suddivisione in funzioni private) è libero.
- **Import espliciti con percorsi relativi** in `pipeline/` e `shared/`: niente auto-import di Nuxt, perché `tsx` e Vitest caricano questi file fuori da Nuxt.
- A fine task di Giovanni, Claude fa la code review e riscrive i commenti secondo le regole di `CLAUDE.md`, toccando solo i commenti.
- Comandi utili: `npx vitest run test/unit/pipeline/html.test.ts` esegue un solo file di test; `npx vitest test/unit/pipeline` resta in ascolto e riesegue a ogni salvataggio.

## Mappa dei file

| File                                                                            | Chi      | Responsabilità                                      |
| ------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| `pipeline/tsconfig.json`, `tsconfig.json`, script `pipeline` in `package.json`  | Claude   | Strumenti                                           |
| `shared/utils/sources.ts`, `shared/utils/tags.ts`                               | Giovanni | Registro con i feed, `FeedSourceId`, tag `deepmind` |
| `shared/types/article.ts`, `app/pages/index.vue`, `app/pages/articles/[id].vue` | Giovanni | Via `summary` e `getArticleText`                    |
| `pipeline/article-id.ts`                                                        | Giovanni | `articleId`                                         |
| `pipeline/html.ts`                                                              | Giovanni | `sanitizeReleaseHtml`, `htmlToText`, `truncateText` |
| `pipeline/assign-tags.ts`                                                       | Giovanni | `assignTags`                                        |
| `pipeline/config.ts`                                                            | Giovanni | Costanti                                            |
| `pipeline/merge.ts`                                                             | Giovanni | `isWithinWindow`, `mergeArticles`                   |
| `pipeline/normalize.ts`                                                         | Giovanni | `normalizeFeed`                                     |
| `pipeline/pipeline.ts`                                                          | Giovanni | `runPipeline`                                       |
| `pipeline/fetch-feed.ts`, `pipeline/run.ts`                                     | Giovanni | Rete e file: `fetchFeed`, punto d'ingresso          |
| `.github/workflows/ingest.yml`                                                  | Giovanni | L'Action                                            |
| `test/unit/**`, `test/fixtures/feeds/*`, `data/articles.json` (dati finti)      | Claude   | Test, fixture, dati finti                           |
| `CLAUDE.md`                                                                     | Claude   | Documentazione                                      |

---

### Task 0 — Branch · **Giovanni**

- [x] **Passo 1:** merge in `staging` di `docs/stage-3-pipeline` (spec e piano) e push.
- [x] **Passo 2:** il branch della tappa.

```bash
git switch staging && git pull && git switch -c feat/import-pipeline
```

---

### Task 1 — Strumenti · **Claude**

**File:** crea `pipeline/tsconfig.json`; modifica `tsconfig.json`, `package.json`.

- [x] **Passo 1: dipendenze di sviluppo**

```bash
npm i -D tsx @types/node@24
```

- [x] **Passo 2: `pipeline/tsconfig.json`**

Stesse regole di rigore che Nuxt usa per `shared/`. Include anche `shared/**`: la pipeline ne importa i tipi, e così il progetto ha file da controllare fin da subito (un `include` vuoto farebbe fallire `tsc -b`). `tsBuildInfoFile` manda la cache incrementale di `vue-tsc -b` in `node_modules/.cache/`, accanto a quelle di Nuxt e Vite: senza, finirebbe in `pipeline/` come file non tracciato.

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "tsBuildInfoFile": "../node_modules/.cache/pipeline.tsbuildinfo"
  },
  "include": ["./**/*.ts", "../shared/**/*.ts"]
}
```

- [x] **Passo 3: il riferimento in `tsconfig.json`**, dopo quello a `tsconfig.node.json`:

```json
{
  "path": "./pipeline/tsconfig.json"
}
```

- [x] **Passo 4: lo script in `package.json`**

```json
"pipeline": "tsx pipeline/run.ts"
```

- [x] **Passo 5: verifica**

```bash
npm run typecheck && npm run lint && npm test
```

Atteso: tutto verde. Prova già fatta durante la stesura del piano: con il riferimento, un errore di tipo in `pipeline/` fa fallire `npm run typecheck`.

- [x] **Passo 6: commit**

```bash
git add pipeline/tsconfig.json tsconfig.json package.json package-lock.json && git commit -m "chore: set up the pipeline workspace"
```

---

### Task 2 — Registro dei feed e tag `deepmind` · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/sources.test.ts` (Claude); modifica `shared/utils/sources.ts`, `shared/utils/tags.ts` (Giovanni).

**Nomi vincolanti:**

| Nome           | Cos'è                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `SOURCES`      | Le 16 fonti con feed delle tabelle della spec, in quell'ordine, poi `devto` e `hackernews` invariate       |
| `FeedSourceId` | Unione degli `id` delle fonti che hanno un `feedUrl` (i 16 feed). La usano `normalizeFeed` e `runPipeline` |
| `TAGS`         | Aggiunge `deepmind: { label: "DeepMind", icon: "simple-icons:deepmind" }`                                  |

Campi delle fonti con feed: `feedUrl`, `category`, `tags` (almeno uno), e per le release `project`. Nome e icona per ogni fonte: come da tabella della spec; le icone sono quelle del progetto (`simple-icons:nuxt`, `simple-icons:vuedotjs`, `simple-icons:nextdotjs`, `simple-icons:react`, `simple-icons:vite`, `simple-icons:svelte`, `simple-icons:typescript`, `simple-icons:openai`, `simple-icons:huggingface`, `simple-icons:deepmind`, `simple-icons:anthropic`). I nomi visualizzati delle release seguono quello esistente: `Vue releases`, `Next.js releases`, eccetera.

- [ ] **Passo 1 (Claude): il test**

`test/unit/sources.test.ts`:

```ts
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../../shared/utils/sources";
import { TAGS } from "../../shared/utils/tags";

// Plain records: the test checks what the registry contains, whatever TypeScript shape it has.
const sources = SOURCES as unknown as Record<string, Record<string, unknown>>;

// The registry of the stage 3 spec, in registry order. Order matters: on duplicate URLs the first source wins.
const FEEDS = {
  "nuxt-blog": { kind: "rss", feedUrl: "https://nuxt.com/blog/rss.xml", category: "frontend", tags: ["nuxt"] },
  "nextjs-blog": { kind: "rss", feedUrl: "https://nextjs.org/feed.xml", category: "frontend", tags: ["nextjs"] },
  "react-blog": { kind: "rss", feedUrl: "https://react.dev/rss.xml", category: "frontend", tags: ["react"] },
  "vite-blog": { kind: "rss", feedUrl: "https://vite.dev/blog.rss", category: "frontend", tags: ["vite"] },
  "svelte-blog": { kind: "rss", feedUrl: "https://svelte.dev/blog/rss.xml", category: "frontend", tags: ["svelte"] },
  "typescript-blog": {
    kind: "rss",
    feedUrl: "https://devblogs.microsoft.com/typescript/feed/",
    category: "frontend",
    tags: ["typescript"],
  },
  "openai-news": { kind: "rss", feedUrl: "https://openai.com/news/rss.xml", category: "ai", tags: ["openai"] },
  "huggingface-blog": {
    kind: "rss",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    category: "ai",
    tags: ["huggingface"],
  },
  "deepmind-blog": { kind: "rss", feedUrl: "https://deepmind.google/blog/rss.xml", category: "ai", tags: ["deepmind"] },
  "anthropic-news": {
    kind: "rss",
    feedUrl: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
    category: "ai",
    tags: ["anthropic"],
  },
  "nuxt-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/nuxt/nuxt/releases.atom",
    project: "Nuxt",
    category: "frontend",
    tags: ["nuxt", "release"],
  },
  "vue-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vuejs/core/releases.atom",
    project: "Vue",
    category: "frontend",
    tags: ["vue", "release"],
  },
  "nextjs-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vercel/next.js/releases.atom",
    project: "Next.js",
    category: "frontend",
    tags: ["nextjs", "release"],
  },
  "react-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/facebook/react/releases.atom",
    project: "React",
    category: "frontend",
    tags: ["react", "release"],
  },
  "vite-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/vitejs/vite/releases.atom",
    project: "Vite",
    category: "frontend",
    tags: ["vite", "release"],
  },
  "typescript-releases": {
    kind: "github-release",
    feedUrl: "https://github.com/microsoft/TypeScript/releases.atom",
    project: "TypeScript",
    category: "frontend",
    tags: ["typescript", "release"],
  },
};

const require = createRequire(import.meta.url);

function iconExists(name: string): boolean {
  const [collection, icon] = name.split(":");
  const { icons, aliases = {} } = require(`@iconify-json/${collection}/icons.json`);
  return icon !== undefined && (icon in icons || icon in aliases);
}

describe("SOURCES", () => {
  it("lists the feed sources in the order of the spec, then the API sources", () => {
    expect(Object.keys(SOURCES)).toEqual([...Object.keys(FEEDS), "devto", "hackernews"]);
  });

  it.each(Object.entries(FEEDS))("registers %s as the spec says", (id, expected) => {
    expect(sources[id]).toMatchObject(expected);
  });

  it("gives every source a display name", () => {
    for (const source of Object.values(sources)) expect(String(source.name).trim()).not.toBe("");
  });

  it("gives a title prefix only to release sources", () => {
    for (const source of Object.values(sources)) {
      if (source.kind === "github-release") expect(String(source.project).trim()).not.toBe("");
      else expect(source).not.toHaveProperty("project");
    }
  });

  it("keeps devto and hackernews without a feed until their adapters exist", () => {
    expect(sources.devto).not.toHaveProperty("feedUrl");
    expect(sources.hackernews).not.toHaveProperty("feedUrl");
  });
});

describe("TAGS", () => {
  it("has a DeepMind tag", () => {
    expect(TAGS).toHaveProperty("deepmind", { label: "DeepMind", icon: "simple-icons:deepmind" });
  });
});

describe("icons", () => {
  it("exist in the installed Iconify collections", () => {
    const names = [...Object.values(sources), ...Object.values(TAGS)].map((entry) => String(entry.icon));
    for (const name of names) expect(iconExists(name), name).toBe(true);
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**

Esegui: `npx vitest run test/unit/sources.test.ts`. Atteso: FAIL sull'ordine delle chiavi, sulle nuove fonti e sul tag `deepmind`; il test delle icone passa già.

- [ ] **Passo 3 (Giovanni): registro e vocabolario**

Suggerimenti:

- Un'**unione discriminata** su `kind` descrive bene "`feedUrl` c'è solo per certi tipi": un ramo per `rss`, uno per `github-release` (con `project`), uno per `hn` e `devto`. TypeScript poi restringe il tipo da solo quando controlli `kind`.
- Con `as const` gli array diventano di sola lettura: nel tipo, i tag delle fonti vanno scritti come `readonly TagId[]`.
- `FeedSourceId` si ricava con un tipo mappato sulle chiavi di `SOURCES` che tiene solo quelle il cui valore ha un `feedUrl` (il costrutto `T extends { feedUrl: string } ? K : never`).
- `Category` va importata da `../types/article` con `import type`: l'import circolare tra tipi è innocuo.

- [ ] **Passo 4 (Giovanni): far passare i test**

Esegui: `npm test && npm run typecheck`. Atteso: PASS; le pagine continuano a compilare perché `name` e `icon` restano su ogni fonte.

- [ ] **Passo 5 (Giovanni): commit**: `feat(model): register feed sources and the deepmind tag`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 3 — Via i riassunti · **Claude (test e dati) → Giovanni (codice)**

**File:** elimina `test/unit/article-text.test.ts`, modifica `test/unit/articles-data.test.ts` e `data/articles.json` (Claude); modifica `shared/types/article.ts`, `app/pages/index.vue`, `app/pages/articles/[id].vue`, elimina `shared/utils/article-text.ts` (Giovanni).

- [ ] **Passo 1 (Claude): test e dati finti**

Eliminare `test/unit/article-text.test.ts`. In `test/unit/articles-data.test.ts`, righe 10–11:

```ts
const OPTIONAL_FIELDS = ["excerpt", "contentHtml", "discussionUrl", "coverImageUrl"];
const TEXT_FIELDS = ["excerpt", "contentHtml"];
```

Togliere `summary` dai 4 articoli finti che lo hanno:

```bash
node -e 'const fs=require("fs");const p="data/articles.json";const a=JSON.parse(fs.readFileSync(p,"utf8"));for(const x of a)delete x.summary;fs.writeFileSync(p,JSON.stringify(a,null,2)+"\n")'
```

- [ ] **Passo 2 (Claude): verifica**

Esegui: `npm test`. Atteso: PASS (il test d'integrità ora rifiuterebbe un `summary`).

- [ ] **Passo 3 (Giovanni): modello e pagine**

- `shared/types/article.ts`: via `summary` e il suo commento.
- Eliminare `shared/utils/article-text.ts`: senza riassunto, `getArticleText` restituirebbe solo `article.excerpt`.
- `app/pages/index.vue` (riga 46) e `app/pages/articles/[id].vue` (riga 47): `article.excerpt` al posto di `getArticleText(article)`.
- `app/pages/articles/[id].vue` (riga 40): il testo "Frontwire only shows a summary" diventa "Frontwire only shows an excerpt".

- [ ] **Passo 4 (Giovanni): verifica**

```bash
grep -rn "summary\|getArticleText" app server shared test
npm run typecheck && npm run lint && npm test
```

Atteso: `grep` non trova nulla; tutto verde. Con `npm run dev`, archivio e dettaglio mostrano l'estratto dove c'è.

- [ ] **Passo 5 (Giovanni): commit**: `refactor(model): drop AI summaries`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 4 — `id` dell'articolo · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/pipeline/article-id.test.ts` (Claude); `pipeline/article-id.ts` (Giovanni).

**Firma:** `articleId(url: string): string`

- [ ] **Passo 1 (Claude): il test**

`test/unit/pipeline/article-id.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";

// Expected values computed with the reference algorithm of the stage 1 spec.
const POST_ID = "061128ccde4c"; // https://example.com/post

describe("articleId", () => {
  it("is the first 12 hex characters of the SHA-256 of the normalized URL", () => {
    expect(articleId("https://example.com/post")).toBe(POST_ID);
    expect(articleId("https://github.com/nuxt/nuxt/releases/tag/v4.5.2")).toBe("fafd2b5b0000");
  });

  it("lowercases the host and drops a leading www.", () => {
    expect(articleId("https://www.Example.com/post")).toBe(POST_ID);
  });

  it("keeps the case of the path", () => {
    expect(articleId("https://example.com/Post")).toBe("faa5bccd9b3e");
  });

  it("drops the fragment", () => {
    expect(articleId("https://example.com/post#comments")).toBe(POST_ID);
  });

  it("drops utm_* and ref tracking parameters", () => {
    expect(articleId("https://example.com/post?utm_source=rss&utm_medium=feed&ref=hn")).toBe(POST_ID);
  });

  it("keeps other parameters, sorted", () => {
    expect(articleId("https://example.com/post?b=2&a=1")).toBe("4151d26c579d");
    expect(articleId("https://example.com/post?a=1&b=2")).toBe("4151d26c579d");
    expect(articleId("https://example.com/post?referrer=x")).not.toBe(POST_ID);
  });

  it("drops the trailing slash, except for the root", () => {
    expect(articleId("https://example.com/post/")).toBe(POST_ID);
    expect(articleId("https://example.com/")).toBe("0f115db062b7");
    expect(articleId("https://example.com")).toBe("0f115db062b7");
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**

Esegui: `npx vitest run test/unit/pipeline/article-id.test.ts`. Atteso: FAIL, il modulo non esiste.

- [ ] **Passo 3 (Giovanni): implementare**

Suggerimenti:

- L'algoritmo è quello della spec della tappa 1 (sezione "Algoritmo dell'`id`").
- L'oggetto `URL` fa quasi tutto: `hostname` è già in minuscolo, `hash` si svuota, `searchParams` ha `delete` e `sort`.
- Attenzione a cancellare parametri mentre si scorre `searchParams`: conviene prima copiarne le chiavi in un array.
- Lo SHA-256 viene da `createHash` di `node:crypto`, con `digest("hex")`.

- [ ] **Passo 4 (Giovanni): far passare i test**
- [ ] **Passo 5 (Giovanni): commit**: `feat(pipeline): add article id`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 5 — HTML e testo · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/pipeline/html.test.ts` (Claude); `pipeline/html.ts` (Giovanni).

**Firme:**

- `sanitizeReleaseHtml(html: string): string`: l'HTML delle note di rilascio, ristretto all'allowlist della spec.
- `htmlToText(html: string): string`: testo semplice su una riga.
- `truncateText(text: string, maxLength: number): string`: al massimo `maxLength` caratteri, ellissi compresa.

- [ ] **Passo 1 (Claude): il test**

`test/unit/pipeline/html.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { htmlToText, sanitizeReleaseHtml, truncateText } from "../../../pipeline/html";

describe("sanitizeReleaseHtml", () => {
  it("keeps headings, paragraphs, lists, links, code and emphasis", () => {
    const html =
      '<h2>Features</h2><p>See <a href="https://github.com/nuxt/nuxt/pull/1">#1</a>.</p>' +
      "<ul><li><strong>bold</strong> <em>em</em> <code>useFetch</code></li></ul>" +
      "<pre><code>npm i nuxt</code></pre><blockquote><p>Note</p></blockquote>";
    expect(sanitizeReleaseHtml(html)).toBe(html);
  });

  it("drops scripts and styles together with their content", () => {
    expect(sanitizeReleaseHtml("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("<p>a</p>");
  });

  it("drops every attribute except a link's href", () => {
    const html =
      '<p id="x" class="y" style="color:red" onclick="evil()">a <a href="https://example.com" target="_blank">b</a></p>';
    expect(sanitizeReleaseHtml(html)).toBe('<p>a <a href="https://example.com">b</a></p>');
  });

  it("drops javascript: links but keeps their text", () => {
    expect(sanitizeReleaseHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("drops images", () => {
    expect(sanitizeReleaseHtml('<p>a <img src="https://example.com/x.png"> b</p>')).toBe("<p>a  b</p>");
  });

  it("unwraps tags outside the allowlist and keeps their text", () => {
    expect(sanitizeReleaseHtml("<details><summary>More</summary><p>hidden</p></details>")).toBe("More<p>hidden</p>");
  });
});

describe("htmlToText", () => {
  it("strips tags and separates block elements with a space", () => {
    expect(htmlToText("<h2>Fixes</h2><p>First</p><ul><li>one</li><li>two</li></ul>")).toBe("Fixes First one two");
  });

  it("keeps inline elements attached to the surrounding text", () => {
    expect(htmlToText("<p>use<strong>Fetch</strong> and <a href='#'>links</a></p>")).toBe("useFetch and links");
  });

  it("decodes entities", () => {
    expect(htmlToText("<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39; &nbsp;f</p>")).toBe(`a & b <c> "d" 'e' f`);
  });

  it("drops the content of scripts and styles", () => {
    expect(htmlToText("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("a");
  });

  it("collapses whitespace and trims", () => {
    expect(htmlToText("  a\n\n  b\t c  ")).toBe("a b c");
  });

  it("returns an empty string when there is no text", () => {
    expect(htmlToText("")).toBe("");
    expect(htmlToText("<p> </p>")).toBe("");
  });
});

describe("truncateText", () => {
  it("returns text within the limit unchanged", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("exactly10!", 10)).toBe("exactly10!");
  });

  it("cuts at the last word boundary and adds an ellipsis, staying within the limit", () => {
    const result = truncateText("The quick brown fox jumps", 12);
    expect(result).toBe("The quick…");
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it("drops punctuation left dangling before the ellipsis", () => {
    expect(truncateText("Hello, world again", 9)).toBe("Hello…");
  });

  it("cuts inside a word that has no space before the limit", () => {
    expect(truncateText("Supercalifragilistic", 10)).toBe("Supercali…");
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**
- [ ] **Passo 3 (Giovanni): dipendenza e implementazione**

```bash
npm i -D sanitize-html @types/sanitize-html
```

Suggerimenti:

- `sanitizeHtml(html, options)`: le opzioni che servono sono `allowedTags`, `allowedAttributes` (solo `href` sui link) e `allowedSchemes`. Il contenuto di `script` e `style` viene già scartato di default.
- Per il testo semplice basta la stessa funzione con `allowedTags: []`, ma da sola ha due difetti, verificati: incolla i blocchi (`<h2>Fixes</h2><p>First</p>` diventa `FixesFirst`) e lascia codificati `&amp;`, `&lt;`, `&gt;`, `&quot;`. Quindi: prima sostituisci i tag di blocco con uno spazio, poi togli i tag, poi decodifica quelle quattro entità (`&amp;` per ultima, altrimenti `&amp;lt;` diventerebbe `<`), infine compatta gli spazi.
- Il troncamento taglia all'ultimo spazio entro il limite meno uno (il posto dell'ellissi) e toglie virgole o punti rimasti in fondo prima di aggiungere `…`.

- [ ] **Passo 4 (Giovanni): far passare i test**
- [ ] **Passo 5 (Giovanni): commit**: `feat(pipeline): add html helpers`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 6 — Tag da parole chiave · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/pipeline/assign-tags.test.ts` (Claude); `pipeline/assign-tags.ts` (Giovanni).

**Firma:** `assignTags(title: string, defaults: readonly TagId[]): TagId[]`: i tag di default, poi quelli trovati nel titolo in ordine di vocabolario, senza doppioni.

- [ ] **Passo 1 (Claude): il test**

`test/unit/pipeline/assign-tags.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assignTags } from "../../../pipeline/assign-tags";

describe("assignTags", () => {
  it("starts from the source's default tags", () => {
    expect(assignTags("Our research roadmap", ["openai"])).toEqual(["openai"]);
  });

  it("appends the tags whose keywords appear in the title, in vocabulary order", () => {
    expect(assignTags("Deploying Vue and Nuxt apps", ["release"])).toEqual(["release", "nuxt", "vue"]);
  });

  it("does not repeat a default tag", () => {
    expect(assignTags("Nuxt v4.5.2", ["nuxt", "release"])).toEqual(["nuxt", "release"]);
  });

  it("ignores case", () => {
    expect(assignTags("NEXT.JS and SVELTEKIT", ["react"])).toEqual(["react", "nextjs", "svelte"]);
  });

  it("matches whole words only", () => {
    expect(assignTags("Vitest reactivity tips", ["typescript"])).toEqual(["typescript"]);
  });

  it.each([
    ["Introducing GPT-5.6 Sol", "openai"],
    ["GPT‑5 mini is here", "openai"],
    ["ChatGPT for teams", "openai"],
    ["OpenAI and the new API", "openai"],
    ["Claude Code 2.0", "anthropic"],
    ["Anthropic raises Series G", "anthropic"],
    ["DeepSeek V4 released", "deepseek"],
    ["Hugging Face Hub update", "huggingface"],
    ["HuggingFace datasets", "huggingface"],
    ["Gemini 3.5 Flash", "gemini"],
    ["Google DeepMind's AlphaGenome", "deepmind"],
    ["TypeScript 7.0", "typescript"],
    ["Vue.js 3.6 beta", "vue"],
    ["React Compiler 1.0", "react"],
    ["Vite 8 is out", "vite"],
    ["Svelte 6", "svelte"],
  ] as const)("tags %j with %s", (title, tag) => {
    expect(assignTags(title, ["release"])).toContain(tag);
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**
- [ ] **Passo 3 (Giovanni): implementare**

Suggerimenti:

- Una lista di coppie `[TagId, RegExp]` nell'ordine del vocabolario; per ogni coppia che corrisponde, il tag entra se non c'è già.
- `\b` limita la ricerca alle parole intere (`Vitest` non è `Vite`); il flag `i` ignora le maiuscole.
- OpenAI scrive spesso `GPT‑5` con il trattino non separabile U+2011, non con `-`: la regola deve accettare entrambi.

- [ ] **Passo 4 (Giovanni): far passare i test**
- [ ] **Passo 5 (Giovanni): commit**: `feat(pipeline): add keyword tags`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 7 — Costanti e unione con l'archivio · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/pipeline/merge.test.ts` (Claude); `pipeline/config.ts`, `pipeline/merge.ts` (Giovanni).

**Costanti** (`pipeline/config.ts`), dalla spec: `RETENTION_DAYS = 30`, `EXCERPT_LENGTH = 300`, `FETCH_TIMEOUT_MS = 15_000`, `USER_AGENT = "frontwire (+https://github.com/GioManara96/frontwire)"`.

**Firme:**

- `isWithinWindow(publishedAt: string, now: Date): boolean`: vero se la data è al massimo 30 giorni prima di `now`, estremo incluso; le date future sono dentro.
- `mergeArticles(existing: Article[], incoming: Article[], now: Date): Article[]`: gli articoli esistenti restano come sono; tra quelli in arrivo entrano solo gli `id` nuovi, e se due hanno lo stesso `id` vince il primo; poi via quelli fuori finestra; ordine dal più recente, a parità di data per `id`. Non modifica gli array ricevuti.

- [ ] **Passo 1 (Claude): il test**

`test/unit/pipeline/merge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isWithinWindow, mergeArticles } from "../../../pipeline/merge";
import type { Article } from "../../../shared/types/article";

const NOW = new Date("2026-09-15T12:00:00Z");

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: "000000000000",
    title: "Title",
    url: "https://example.com/post",
    sourceId: "nextjs-blog",
    publishedAt: "2026-09-10T00:00:00.000Z",
    category: "frontend",
    tags: ["nextjs"],
    ...overrides,
  };
}

describe("isWithinWindow", () => {
  it("includes an article published exactly 30 days ago", () => {
    expect(isWithinWindow("2026-08-16T12:00:00.000Z", NOW)).toBe(true);
  });

  it("excludes an article published one second earlier", () => {
    expect(isWithinWindow("2026-08-16T11:59:59.000Z", NOW)).toBe(false);
  });

  it("includes dates in the future", () => {
    expect(isWithinWindow("2026-09-16T00:00:00.000Z", NOW)).toBe(true);
  });
});

describe("mergeArticles", () => {
  it("adds incoming articles with new ids", () => {
    const stored = makeArticle({ id: "aaaaaaaaaaaa" });
    const fresh = makeArticle({ id: "bbbbbbbbbbbb" });
    expect(mergeArticles([stored], [fresh], NOW).map((article) => article.id)).toEqual([
      "aaaaaaaaaaaa",
      "bbbbbbbbbbbb",
    ]);
  });

  it("never overwrites an article that is already in the archive", () => {
    const stored = makeArticle({ id: "aaaaaaaaaaaa", title: "Stored", excerpt: "Stored excerpt." });
    const fresh = makeArticle({ id: "aaaaaaaaaaaa", title: "Edited upstream" });
    expect(mergeArticles([stored], [fresh], NOW)).toEqual([stored]);
  });

  it("keeps the first incoming article when two sources share an id", () => {
    const first = makeArticle({ id: "aaaaaaaaaaaa", sourceId: "nextjs-blog" });
    const second = makeArticle({ id: "aaaaaaaaaaaa", sourceId: "openai-news" });
    expect(mergeArticles([], [first, second], NOW)).toEqual([first]);
  });

  it("drops stored and incoming articles outside the 30-day window", () => {
    const oldStored = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-08-01T00:00:00.000Z" });
    const oldIncoming = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-08-02T00:00:00.000Z" });
    const recent = makeArticle({ id: "cccccccccccc" });
    expect(mergeArticles([oldStored], [oldIncoming, recent], NOW)).toEqual([recent]);
  });

  it("orders from newest to oldest, then by id when dates are equal", () => {
    const older = makeArticle({ id: "aaaaaaaaaaaa", publishedAt: "2026-09-01T00:00:00.000Z" });
    const newest = makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-14T00:00:00.000Z" });
    const tieB = makeArticle({ id: "dddddddddddd", publishedAt: "2026-09-10T00:00:00.000Z" });
    const tieA = makeArticle({ id: "cccccccccccc", publishedAt: "2026-09-10T00:00:00.000Z" });
    const ids = mergeArticles([older, tieB], [newest, tieA], NOW).map((article) => article.id);
    expect(ids).toEqual(["bbbbbbbbbbbb", "cccccccccccc", "dddddddddddd", "aaaaaaaaaaaa"]);
  });

  it("does not modify the arrays it receives", () => {
    const existing = [makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-01T00:00:00.000Z" })];
    const incoming = [
      makeArticle({ id: "aaaaaaaaaaaa" }),
      makeArticle({ id: "cccccccccccc", publishedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const snapshot = structuredClone({ existing, incoming });
    mergeArticles(existing, incoming, NOW);
    expect({ existing, incoming }).toEqual(snapshot);
  });

  it("produces byte-identical JSON when nothing changed", () => {
    const incoming = [
      makeArticle({ id: "aaaaaaaaaaaa" }),
      makeArticle({ id: "bbbbbbbbbbbb", publishedAt: "2026-09-12T00:00:00.000Z" }),
    ];
    const firstRun = mergeArticles([], incoming, NOW);
    const secondRun = mergeArticles(firstRun, incoming, NOW);
    expect(JSON.stringify(secondRun, null, 2)).toBe(JSON.stringify(firstRun, null, 2));
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**
- [ ] **Passo 3 (Giovanni): implementare**

Suggerimenti:

- Una `Map` per `id` rende naturali entrambe le regole di precedenza: prima si inseriscono gli esistenti, poi gli arrivi solo se la chiave manca.
- `[...map.values()]` è un array nuovo: ordinarlo sul posto non tocca gli input.
- Nel comparatore dell'ordinamento, `||` passa al secondo criterio quando il primo dà `0`; `localeCompare` confronta gli `id`.

- [ ] **Passo 4 (Giovanni): far passare i test**
- [ ] **Passo 5 (Giovanni): commit**: `feat(pipeline): merge incoming articles into the archive`
- [ ] **Passo 6 (Claude): code review e riscrittura dei commenti**

---

### Task 8 — Normalizzazione dei feed · **Claude (fixture e test) → Giovanni (codice)**

**File:** crea `test/fixtures/feeds/rss.xml`, `rss-media.xml`, `atom-releases.xml`, `broken.xml`, `test/unit/pipeline/normalize.test.ts` (Claude); `pipeline/normalize.ts` (Giovanni).

**Firma:** `normalizeFeed(xml: string, sourceId: FeedSourceId, now: Date): NormalizeResult`, con `NormalizeResult = { articles: Article[]; skipped: number }` esportato. Legge categoria, tag e `project` da `SOURCES[sourceId]`; applica le regole di normalizzazione della spec; `skipped` conta le voci scartate per qualsiasi motivo. Lancia un errore se l'XML non è un feed, o se il formato non corrisponde al `kind` della fonte (il messaggio nomina il formato atteso: `RSS` o `Atom`).

- [ ] **Passo 1 (Claude): le fixture**

`test/fixtures/feeds/rss.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Next.js Blog</title>
    <link>https://nextjs.org/blog</link>
    <description>The latest Next.js news</description>
    <item>
      <title>Next.js 16.4</title>
      <link>https://nextjs.org/blog/next-16-4</link>
      <description>Next.js 16.4 improves Turbopack build times and stabilizes the new caching APIs.</description>
      <pubDate>Fri, 04 Sep 2026 16:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Building with React Server Components</title>
      <link>https://nextjs.org/blog/rsc-guide?utm_source=rss#intro</link>
      <description>&lt;p&gt;Server Components &amp;amp; streaming change how data reaches the browser. This guide walks through fetching on the server, passing props to Client Components, and caching the results.&lt;/p&gt;&lt;p&gt;It also covers error boundaries, loading states, and how to move an existing page from the Pages Router without breaking deep links or analytics.&lt;/p&gt;</description>
      <pubDate>Thu, 10 Sep 2026 09:30:00 +0200</pubDate>
    </item>
    <item>
      <title>Old post</title>
      <link>https://nextjs.org/blog/old-post</link>
      <description>Published before the 30-day window.</description>
      <pubDate>Wed, 01 Jul 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>No link</title>
      <description>This item has no link.</description>
      <pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Relative link</title>
      <link>/blog/relative-link</link>
      <pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Bad date</title>
      <link>https://nextjs.org/blog/bad-date</link>
      <pubDate>not a date</pubDate>
    </item>
    <item>
      <title>Only encoded content</title>
      <link>https://nextjs.org/blog/only-encoded</link>
      <content:encoded><![CDATA[<p>Encoded body text.</p>]]></content:encoded>
      <pubDate>Sat, 12 Sep 2026 08:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Title only</title>
      <link>https://nextjs.org/blog/title-only</link>
      <pubDate>Sun, 13 Sep 2026 08:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Echoed title</title>
      <link>https://nextjs.org/blog/echoed-title</link>
      <description>Echoed title</description>
      <pubDate>Mon, 14 Sep 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

`test/fixtures/feeds/rss-media.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Google DeepMind</title>
    <link>https://deepmind.google/blog/</link>
    <description>Covers in every shape the pipeline accepts</description>
    <item>
      <title>Cover from media content</title>
      <link>https://deepmind.google/blog/media-content/</link>
      <description>Media content wins over the other candidates.</description>
      <pubDate>Mon, 14 Sep 2026 09:00:00 GMT</pubDate>
      <media:content url="https://deepmind.google/img/content.jpg" medium="image" type="image/jpeg"/>
      <media:thumbnail url="https://deepmind.google/img/thumbnail.jpg"/>
      <enclosure url="https://deepmind.google/img/enclosure.png" type="image/png" length="1"/>
    </item>
    <item>
      <title>Cover from thumbnail</title>
      <link>https://deepmind.google/blog/thumbnail/</link>
      <description>Only a thumbnail.</description>
      <pubDate>Mon, 14 Sep 2026 08:00:00 GMT</pubDate>
      <media:thumbnail url="https://deepmind.google/img/thumbnail.jpg"/>
    </item>
    <item>
      <title>Cover from enclosure</title>
      <link>https://deepmind.google/blog/enclosure/</link>
      <description>Only an image enclosure.</description>
      <pubDate>Mon, 14 Sep 2026 07:00:00 GMT</pubDate>
      <enclosure url="https://deepmind.google/img/enclosure.png" type="image/png" length="1"/>
    </item>
    <item>
      <title>Audio enclosure</title>
      <link>https://deepmind.google/blog/podcast/</link>
      <description>An audio enclosure is not a cover.</description>
      <pubDate>Mon, 14 Sep 2026 06:00:00 GMT</pubDate>
      <enclosure url="https://deepmind.google/audio/episode.mp3" type="audio/mpeg" length="1"/>
    </item>
    <item>
      <title>Relative media URL</title>
      <link>https://deepmind.google/blog/relative-media/</link>
      <description>The relative media URL is ignored, the enclosure is used.</description>
      <pubDate>Mon, 14 Sep 2026 05:00:00 GMT</pubDate>
      <media:content url="/img/relative.jpg" medium="image"/>
      <enclosure url="https://deepmind.google/img/fallback.png" type="image/png" length="1"/>
    </item>
  </channel>
</rss>
```

`test/fixtures/feeds/atom-releases.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xml:lang="en-US">
  <id>tag:github.com,2008:https://github.com/nuxt/nuxt/releases</id>
  <link type="text/html" rel="alternate" href="https://github.com/nuxt/nuxt/releases"/>
  <title>Release notes from nuxt</title>
  <updated>2026-09-14T10:00:00Z</updated>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v4.5.2</id>
    <updated>2026-09-05T16:19:44Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v4.5.2"/>
    <title>v4.5.2</title>
    <content type="html">&lt;h2&gt;👉 Changelog&lt;/h2&gt;&lt;p onclick="evil()"&gt;&lt;a href="https://github.com/nuxt/nuxt/compare/v4.5.1...v4.5.2"&gt;compare changes&lt;/a&gt;&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;h3&gt;🩹 Fixes&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;&lt;strong&gt;nuxt:&lt;/strong&gt; Keep route params when a page component is reused between navigations (&lt;a href="https://github.com/nuxt/nuxt/pull/33001"&gt;#33001&lt;/a&gt;)&lt;/li&gt;&lt;li&gt;&lt;strong&gt;nuxt:&lt;/strong&gt; Avoid a hydration mismatch when &lt;code&gt;useState&lt;/code&gt; is read inside a layout (&lt;a href="https://github.com/nuxt/nuxt/pull/33002"&gt;#33002&lt;/a&gt;)&lt;/li&gt;&lt;li&gt;&lt;strong&gt;vite:&lt;/strong&gt; Resolve aliases in server-only components during the build (&lt;a href="https://github.com/nuxt/nuxt/pull/33003"&gt;#33003&lt;/a&gt;)&lt;/li&gt;&lt;/ul&gt;&lt;img src="https://example.com/banner.png"&gt;</content>
    <author><name>danielroe</name></author>
    <media:thumbnail height="30" width="30" url="https://avatars.githubusercontent.com/u/28706372?s=60&amp;v=4"/>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v4.6.0-rc.1</id>
    <updated>2026-09-04T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v4.6.0-rc.1"/>
    <title>v4.6.0-rc.1</title>
    <content type="html">&lt;p&gt;Release candidate.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v16.4.0-canary.31</id>
    <updated>2026-09-03T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v16.4.0-canary.31"/>
    <title>v16.4.0-canary.31</title>
    <content type="html">&lt;p&gt;Canary.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/create-vite@9.2.1</id>
    <updated>2026-09-02T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/create-vite%409.2.1"/>
    <title>create-vite@9.2.1</title>
    <content type="html">&lt;p&gt;Package release.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/dropped/page-tree-reuse</id>
    <updated>2026-09-01T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/dropped%2Fpage-tree-reuse"/>
    <title>dropped/page-tree-reuse</title>
    <content type="html">&lt;p&gt;Stray tag.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v6.0-rc</id>
    <updated>2026-08-31T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v6.0-rc"/>
    <title>TypeScript 6.0.1 RC</title>
    <content type="html">&lt;p&gt;Release candidate with a short tag.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v4.4.0</id>
    <published>2026-09-09T18:00:00Z</published>
    <updated>2026-09-10T08:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v4.4.0"/>
    <title>4.4.0 (September 9, 2026)</title>
    <content type="html">&lt;p&gt;Minor fixes.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v3.21.11</id>
    <updated>2026-08-01T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v3.21.11"/>
    <title>v3.21.11</title>
    <content type="html">&lt;p&gt;Older than the window.&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/80811932/v4.5.1</id>
    <updated>2026-08-30T10:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/nuxt/nuxt/releases/tag/v4.5.1"/>
    <title>v4.5.1</title>
    <content type="html"></content>
  </entry>
</feed>
```

`test/fixtures/feeds/broken.xml`:

```xml
<rss version="2.0"><channel><item><title>Broken
```

- [ ] **Passo 2 (Claude): il test**

`test/unit/pipeline/normalize.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { normalizeFeed } from "../../../pipeline/normalize";

const NOW = new Date("2026-09-15T12:00:00Z");

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/feeds/${name}`, import.meta.url), "utf8");
}

function byTitle(xml: string, sourceId: Parameters<typeof normalizeFeed>[1]) {
  const { articles } = normalizeFeed(xml, sourceId, NOW);
  return new Map(articles.map((article) => [article.title, article]));
}

describe("normalizeFeed: blog posts (rss)", () => {
  const rss = fixture("rss.xml");

  it("turns an item into an article with the source's category and tags", () => {
    expect(byTitle(rss, "nextjs-blog").get("Next.js 16.4")).toEqual({
      id: articleId("https://nextjs.org/blog/next-16-4"),
      title: "Next.js 16.4",
      url: "https://nextjs.org/blog/next-16-4",
      sourceId: "nextjs-blog",
      publishedAt: "2026-09-04T16:00:00.000Z",
      category: "frontend",
      tags: ["nextjs"],
      excerpt: "Next.js 16.4 improves Turbopack build times and stabilizes the new caching APIs.",
    });
  });

  it("keeps the original URL and derives the id from its normalized form", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.url).toBe("https://nextjs.org/blog/rsc-guide?utm_source=rss#intro");
    expect(article?.id).toBe(articleId("https://nextjs.org/blog/rsc-guide"));
  });

  it("converts dates with a time zone offset to UTC", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.publishedAt).toBe("2026-09-10T07:30:00.000Z");
  });

  it("adds keyword tags from the title", () => {
    const article = byTitle(rss, "nextjs-blog").get("Building with React Server Components");
    expect(article?.tags).toEqual(["nextjs", "react"]);
  });

  it("turns a long HTML description into a plain-text excerpt of at most 300 characters", () => {
    const excerpt = byTitle(rss, "nextjs-blog").get("Building with React Server Components")?.excerpt ?? "";
    expect(excerpt.startsWith("Server Components & streaming change how data reaches the browser.")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(300);
    expect(excerpt).not.toContain("<");
  });

  it("falls back to content:encoded when there is no description", () => {
    expect(byTitle(rss, "nextjs-blog").get("Only encoded content")?.excerpt).toBe("Encoded body text.");
  });

  it("omits the excerpt when there is no text or it only repeats the title", () => {
    const articles = byTitle(rss, "nextjs-blog");
    expect(articles.get("Title only")).not.toHaveProperty("excerpt");
    expect(articles.get("Echoed title")).not.toHaveProperty("excerpt");
  });

  it("never gives blog posts release notes or a cover they did not provide", () => {
    for (const article of byTitle(rss, "nextjs-blog").values()) {
      expect(article).not.toHaveProperty("contentHtml");
      expect(article).not.toHaveProperty("coverImageUrl");
    }
  });

  it("skips items outside the window, without an absolute link, or with an invalid date", () => {
    const { articles, skipped } = normalizeFeed(rss, "nextjs-blog", NOW);
    expect(articles.map((article) => article.title)).toEqual([
      "Next.js 16.4",
      "Building with React Server Components",
      "Only encoded content",
      "Title only",
      "Echoed title",
    ]);
    expect(skipped).toBe(4);
  });
});

describe("normalizeFeed: covers (rss)", () => {
  const articles = byTitle(fixture("rss-media.xml"), "deepmind-blog");

  it("prefers an image from media:content", () => {
    expect(articles.get("Cover from media content")?.coverImageUrl).toBe("https://deepmind.google/img/content.jpg");
  });

  it("uses media:thumbnail when there is no media:content image", () => {
    expect(articles.get("Cover from thumbnail")?.coverImageUrl).toBe("https://deepmind.google/img/thumbnail.jpg");
  });

  it("uses an image enclosure as the last option", () => {
    expect(articles.get("Cover from enclosure")?.coverImageUrl).toBe("https://deepmind.google/img/enclosure.png");
  });

  it("ignores enclosures that are not images", () => {
    expect(articles.get("Audio enclosure")).not.toHaveProperty("coverImageUrl");
  });

  it("ignores relative image URLs and moves on to the next candidate", () => {
    expect(articles.get("Relative media URL")?.coverImageUrl).toBe("https://deepmind.google/img/fallback.png");
  });

  it("uses the category and default tags of the source", () => {
    const article = articles.get("Cover from media content");
    expect(article?.category).toBe("ai");
    expect(article?.tags).toEqual(["deepmind"]);
  });
});

describe("normalizeFeed: GitHub releases (atom)", () => {
  const atom = fixture("atom-releases.xml");

  it("keeps only stable releases, in feed order, and counts the rest as skipped", () => {
    const { articles, skipped } = normalizeFeed(atom, "nuxt-releases", NOW);
    expect(articles.map((article) => article.title)).toEqual(["Nuxt v4.5.2", "Nuxt v4.4.0", "Nuxt v4.5.1"]);
    // rc, canary, create-vite@…, dropped/…, v6.0-rc, and one older than the window.
    expect(skipped).toBe(6);
  });

  it("builds the title from the project and the tag, ignoring the feed title", () => {
    expect(byTitle(atom, "nuxt-releases").has("Nuxt v4.4.0")).toBe(true);
  });

  it("uses the release page as URL and source of the id", () => {
    const article = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2");
    expect(article?.url).toBe("https://github.com/nuxt/nuxt/releases/tag/v4.5.2");
    expect(article?.id).toBe("fafd2b5b0000");
    expect(article?.sourceId).toBe("nuxt-releases");
    expect(article?.category).toBe("frontend");
    expect(article?.tags).toEqual(["nuxt", "release"]);
  });

  it("prefers the published date and falls back to updated", () => {
    const articles = byTitle(atom, "nuxt-releases");
    expect(articles.get("Nuxt v4.4.0")?.publishedAt).toBe("2026-09-09T18:00:00.000Z");
    expect(articles.get("Nuxt v4.5.2")?.publishedAt).toBe("2026-09-05T16:19:44.000Z");
  });

  it("stores sanitized release notes", () => {
    const html = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")?.contentHtml ?? "";
    expect(html).toContain("<h3>🩹 Fixes</h3>");
    expect(html).toContain('<a href="https://github.com/nuxt/nuxt/pull/33001">#33001</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<img");
  });

  it("derives a plain-text excerpt from the release notes", () => {
    const excerpt = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")?.excerpt ?? "";
    expect(excerpt.startsWith("👉 Changelog compare changes 🩹 Fixes nuxt: Keep route params")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(300);
  });

  it("never uses the author's avatar as a cover", () => {
    expect(byTitle(atom, "nuxt-releases").get("Nuxt v4.5.2")).not.toHaveProperty("coverImageUrl");
  });

  it("omits release notes and excerpt when the release has no body", () => {
    const article = byTitle(atom, "nuxt-releases").get("Nuxt v4.5.1");
    expect(article).not.toHaveProperty("contentHtml");
    expect(article).not.toHaveProperty("excerpt");
  });
});

describe("normalizeFeed: invalid input", () => {
  it("throws on XML that is not a feed", () => {
    expect(() => normalizeFeed(fixture("broken.xml"), "nextjs-blog", NOW)).toThrow();
  });

  it("throws when the feed format does not match the kind of source", () => {
    expect(() => normalizeFeed(fixture("atom-releases.xml"), "nextjs-blog", NOW)).toThrow(/RSS/);
    expect(() => normalizeFeed(fixture("rss.xml"), "nuxt-releases", NOW)).toThrow(/Atom/);
  });
});
```

- [ ] **Passo 3 (Claude): verificare che fallisca**
- [ ] **Passo 4 (Giovanni): dipendenza e implementazione**

```bash
npm i -D feedsmith
```

Suggerimenti, dalle prove fatte su `feedsmith` 2.9:

- `parseFeed(xml)` restituisce `{ format, feed }` e lancia un errore se l'input non è un feed. Con `format === "rss"` le voci sono in `feed.items`, con `"atom"` in `feed.entries`; controllando `format`, TypeScript restringe il tipo di `feed`.
- Voce RSS: `title`, `link`, `description` (già HTML decodificato), `content?.encoded`, `pubDate`, `dc?.date`, `media?.contents` (con `url`, `medium`, `type`), `media?.thumbnails` (con `url`), `enclosures` (con `url`, `type`).
- Voce Atom: `title`, `links` (con `href` e `rel`), `published`, `updated`, `content`.
- `Date.parse` legge sia le date RSS (`Thu, 10 Sep 2026 09:30:00 +0200`) sia quelle ISO; restituisce `NaN` se non capisce. `new Date(ms).toISOString()` dà il formato UTC atteso.
- Il tag della release si prende dal `pathname` del link con una regex su `/releases/tag/<tag>` e `decodeURIComponent` (`create-vite%409.2.1` diventa `create-vite@9.2.1`).
- Per omettere un campo facoltativo: `...(excerpt ? { excerpt } : {})`.
- Le funzioni dei task precedenti fanno il resto: `articleId`, `assignTags`, `htmlToText`, `truncateText`, `sanitizeReleaseHtml`, `isWithinWindow`.

- [ ] **Passo 5 (Giovanni): far passare i test**
- [ ] **Passo 6 (Giovanni): commit**: `feat(pipeline): normalize rss and release feeds`
- [ ] **Passo 7 (Claude): code review e riscrittura dei commenti**

---

### Task 9 — Orchestrazione, rete e primo import vero · **Claude (test) → Giovanni (codice)**

**File:** crea `test/unit/pipeline/pipeline.test.ts` (Claude); `pipeline/pipeline.ts`, `pipeline/fetch-feed.ts`, `pipeline/run.ts` (Giovanni); `data/articles.json` (generato).

**Firme:**

- `runPipeline(deps: PipelineDeps): Promise<PipelineResult>`, con
  - `PipelineDeps = { existing: Article[]; now: Date; fetchFeed: (url: string) => Promise<string> }`;
  - `PipelineResult = { articles: Article[]; added: number; removed: number; skipped: number; warnings: string[] }`.

  Scarica tutte le fonti con feed, normalizza, unisce con `mergeArticles`. Ogni fonte fallita diventa un warning `"<sourceId>: <messaggio d'errore>"`; se falliscono tutte, lancia un errore il cui messaggio contiene `Every source failed`. `added` e `removed` confrontano gli `id` prima e dopo.

- `fetchFeed(url: string): Promise<string>` (`fetch-feed.ts`): `fetch` con l'header `user-agent` e un timeout di `FETCH_TIMEOUT_MS`; se la risposta non è `ok`, lancia `Error("HTTP <status>")`.
- `run.ts`: legge `data/articles.json`, chiama `runPipeline` con `fetchFeed` e `new Date()`, scrive il risultato con `JSON.stringify(articles, null, 2)` più un newline finale, stampa ogni warning come `::warning::<testo>` e una riga di riepilogo (per esempio `Archive: 112 articles (+112 new, -0 expired, 2639 skipped)`). Su errore stampa `::error::<messaggio>` e imposta `process.exitCode = 1`.

- [ ] **Passo 1 (Claude): il test**

`test/unit/pipeline/pipeline.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articleId } from "../../../pipeline/article-id";
import { runPipeline } from "../../../pipeline/pipeline";
import type { Article } from "../../../shared/types/article";

const NOW = new Date("2026-09-15T12:00:00Z");

const NEXTJS_BLOG = "https://nextjs.org/feed.xml";
const OPENAI_NEWS = "https://openai.com/news/rss.xml";
const NUXT_RELEASES = "https://github.com/nuxt/nuxt/releases.atom";

const EMPTY_RSS =
  '<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title>' +
  "<link>https://example.com</link><description>Empty</description></channel></rss>";
const EMPTY_ATOM =
  '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><id>empty</id>' +
  "<title>Empty</title><updated>2026-09-15T00:00:00Z</updated></feed>";

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/feeds/${name}`, import.meta.url), "utf8");
}

/** Serves the given bodies (or throws the given errors) and an empty feed for every other URL. */
function fakeFetch(responses: Record<string, string | Error> = {}) {
  const requested: string[] = [];
  const fetchFeed = async (url: string) => {
    requested.push(url);
    const response = responses[url];
    if (response instanceof Error) throw response;
    return response ?? (url.endsWith(".atom") ? EMPTY_ATOM : EMPTY_RSS);
  };
  return { fetchFeed, requested };
}

const FIXTURES = { [NEXTJS_BLOG]: fixture("rss.xml"), [NUXT_RELEASES]: fixture("atom-releases.xml") };

describe("runPipeline", () => {
  it("requests every feed source once and skips the API sources", async () => {
    const { fetchFeed, requested } = fakeFetch();
    await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(requested).toHaveLength(16);
    expect(new Set(requested).size).toBe(16);
  });

  it("imports the articles of every feed, newest first, and reports the counts", async () => {
    const { fetchFeed } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.articles.map((article) => article.title)).toEqual([
      "Echoed title",
      "Title only",
      "Only encoded content",
      "Building with React Server Components",
      "Nuxt v4.4.0",
      "Nuxt v4.5.2",
      "Next.js 16.4",
      "Nuxt v4.5.1",
    ]);
    expect(result).toMatchObject({ added: 8, removed: 0, skipped: 10, warnings: [] });
  });

  it("keeps stored articles untouched and drops the ones outside the window", async () => {
    const stored: Article = {
      id: articleId("https://nextjs.org/blog/next-16-4"),
      title: "Stored title",
      url: "https://nextjs.org/blog/next-16-4",
      sourceId: "nextjs-blog",
      publishedAt: "2026-09-04T16:00:00.000Z",
      category: "frontend",
      tags: ["nextjs"],
    };
    const expired: Article = {
      ...stored,
      id: "eeeeeeeeeeee",
      title: "Expired",
      publishedAt: "2026-07-01T00:00:00.000Z",
    };
    const { fetchFeed } = fakeFetch(FIXTURES);
    const result = await runPipeline({ existing: [stored, expired], now: NOW, fetchFeed });
    expect(result.articles).toContainEqual(stored);
    expect(result.articles.map((article) => article.title)).not.toContain("Expired");
    expect(result).toMatchObject({ added: 7, removed: 1 });
  });

  it("keeps the article of the first source in registry order when two sources share a URL", async () => {
    const duplicate =
      '<?xml version="1.0"?><rss version="2.0"><channel><title>OpenAI</title><link>https://openai.com</link>' +
      "<description>News</description><item><title>Duplicate</title><link>https://nextjs.org/blog/next-16-4</link>" +
      "<pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>";
    const { fetchFeed } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: duplicate });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    const matches = result.articles.filter((article) => article.url === "https://nextjs.org/blog/next-16-4");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.sourceId).toBe("nextjs-blog");
  });

  it("turns a failing source into a warning and imports the others", async () => {
    const { fetchFeed } = fakeFetch({ ...FIXTURES, [OPENAI_NEWS]: new Error("HTTP 503") });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.warnings).toEqual(["openai-news: HTTP 503"]);
    expect(result.added).toBe(8);
  });

  it("turns a feed that cannot be parsed into a warning", async () => {
    const { fetchFeed } = fakeFetch({ [NEXTJS_BLOG]: fixture("broken.xml") });
    const result = await runPipeline({ existing: [], now: NOW, fetchFeed });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/^nextjs-blog: /);
  });

  it("fails when every source fails", async () => {
    const fetchFeed = async () => {
      throw new Error("offline");
    };
    await expect(runPipeline({ existing: [], now: NOW, fetchFeed })).rejects.toThrow(/every source failed/i);
  });
});
```

- [ ] **Passo 2 (Claude): verificare che fallisca**
- [ ] **Passo 3 (Giovanni): `pipeline.ts`**

Suggerimenti:

- `Promise.allSettled` aspetta tutte le fonti anche quando qualcuna fallisce, e restituisce i risultati nello stesso ordine delle richieste: scorrendoli in ordine di registro, la regola "vince la prima fonte" viene gratis da `mergeArticles`.
- Un'eccezione lanciata dentro un `.then(...)` diventa una promessa rifiutata: così anche un XML rotto finisce tra i warning.
- Per l'elenco delle fonti con feed serve una _type guard_: `function isFeedSource(id: SourceId): id is FeedSourceId`, che controlla `"feedUrl" in SOURCES[id]`.

- [ ] **Passo 4 (Giovanni): far passare i test**
- [ ] **Passo 5 (Giovanni): `fetch-feed.ts` e `run.ts`**

Suggerimenti:

- `AbortSignal.timeout(ms)` si passa come `signal` a `fetch`.
- Il percorso del JSON: `npm run pipeline` parte dalla radice del repo, quindi `data/articles.json` va bene così.
- Il cast `as Article[]` sul JSON letto è sicuro per lo stesso motivo di `getArticles`: il test d'integrità valida il file.

- [ ] **Passo 6 (Giovanni): primo import vero**

I dati finti se ne vanno qui: si parte da un archivio vuoto.

```bash
echo '[]' > data/articles.json
npm run pipeline
npm test
```

Atteso: un riepilogo simile a quello della prova (circa 110 articoli, nessun warning); il test d'integrità passa sui dati veri.

- [ ] **Passo 7 (Giovanni): il secondo run non cambia niente**

```bash
npm run pipeline && git diff --stat data/articles.json
```

Atteso: nessuna differenza rispetto al passo 6, o solo articoli appena pubblicati.

- [ ] **Passo 8 (Giovanni): il sito con i dati veri**

`npm run dev`: archivio e dettaglio con gli articoli veri; una release mostra le note. Poi `NITRO_PRESET=static npx nuxt generate` termina senza errori.

- [ ] **Passo 9 (Giovanni): due commit**

```bash
git add pipeline test && git commit -m "feat(pipeline): fetch the feeds and write the archive"
git add data/articles.json && git commit -m "chore(data): replace mock articles with the first real import"
```

- [ ] **Passo 10 (Claude): code review e riscrittura dei commenti**

---

### Task 10 — Il workflow · **Giovanni**

**File:** crea `.github/workflows/ingest.yml`.

**Requisiti** (dalla spec, sezione "Workflow"): nome `Ingest articles`; cron `17 */6 * * *` più `workflow_dispatch`; `permissions: contents: write`; `concurrency` con gruppo `ingest` e `cancel-in-progress: false`; un job su `ubuntu-latest` con `timeout-minutes: 15` e questi passi:

1. `actions/checkout@v7`;
2. `actions/setup-node@v7` con `node-version: 24` e `cache: npm`;
3. `npm ci`;
4. `npm run pipeline`;
5. `npx vitest run test/unit/articles-data.test.ts`;
6. commit e push di `data/articles.json` solo se è cambiato.

**Suggerimenti:**

- `git diff --quiet -- data/articles.json` esce con `0` se il file è identico e con `1` se è cambiato: in shell, `cmd || altro` esegue `altro` solo nel secondo caso.
- L'identità del bot: nome `github-actions[bot]`, email `41898282+github-actions[bot]@users.noreply.github.com` (così GitHub mostra l'avatar del bot).
- Il checkout configura già le credenziali del `GITHUB_TOKEN`: `git push` funziona senza altro, grazie a `contents: write`.
- `actionlint` (`brew install actionlint`) controlla il file in locale prima del push.

**Criteri di accettazione:**

- [ ] `actionlint .github/workflows/ingest.yml` non segnala errori (se installato)
- [ ] commit: `ci: schedule the article import`
- [ ] **Claude:** code review del workflow e dei commenti

L'Action girerà davvero solo dopo il merge su `main` (Task 11).

---

### Task 11 — Chiusura e primo run · **Claude**, poi **Giovanni**

- [ ] **Claude:** verifica completa, tutto verde:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && NITRO_PRESET=static npx nuxt generate
```

- [ ] **Claude:** aggiornare `CLAUDE.md`, concordandolo con Giovanni (vedi la sezione "Documentazione" della spec), e committare: `docs: update CLAUDE.md after stage 3`
- [ ] **Giovanni:** merge di `feat/import-pipeline` in `staging`, poi di `staging` in `main`, e push di entrambi.
- [ ] **Giovanni:** su GitHub, Actions → "Ingest articles" → "Run workflow". Atteso: run verde e, se sono usciti articoli dal momento del primo import, un commit `chore(data): update articles` di `github-actions[bot]` su `main`.
- [ ] **Giovanni:** riallineare `staging`:

```bash
git switch staging && git pull && git merge main && git push
```

- [ ] **Giovanni:** il giorno dopo, controllare nella tab Actions che i run pianificati siano partiti.
