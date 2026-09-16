# Frontwire

The web development news I actually want to read, in one page: frontend frameworks (Nuxt, Next, Vue, React, Vite…) and the AI that concerns people who write code — models, APIs and developer tools.

**Live at [frontwire.giovannimanara.dev](https://frontwire.giovannimanara.dev).**

AI applied to other fields, company news and funding rounds stay out. The archive is meant to be read whole: at most 3 articles per source, the newest, within the last 30 days — around thirty in all.

## How it works

No database and no server. The site is static and the data lives in the repository.

1. A scheduled GitHub Action (`.github/workflows/ingest.yml`, every 6 hours) fetches the sources, normalizes the articles, drops duplicates, assigns tags, and discards AI articles that have nothing to do with building software.
2. The articles are written to `data/articles.json` and committed to `main` by the bot.
3. Every push to `main`, the bot's included, triggers a static deploy on Vercel.

Sources are RSS/Atom feeds and official APIs only — never scraping. Articles are never republished in full: the archive keeps the source's own excerpt and links out, with GitHub release notes as the one exception.

There are no AI summaries: the feeds carry a one-line description at best, so there is nothing to summarize, and the project runs at zero cost. For the same reason the relevance filter is a rule over the title, not a classifier.

## Features

- **Archive** with filters by category (frontend / AI) and tag, several tags OR-ed, kept in the URL (`/?category=ai&tags=react,vue`). A bar on the phone, a column beside the articles on wider screens.
- **Saved articles** in `localStorage`, no account: what is saved is a copy of the article, so it stays readable after the archive has dropped it.
- **Detail page** for the articles that come with text; the others link straight to the original.

## Stack

Nuxt 4, Vue 3, TypeScript, Tailwind CSS v4, Vitest. The pipeline is TypeScript run with `tsx`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # the static build used in production
npm run preview    # serve that build locally
npm run pipeline   # import articles into data/articles.json
npm run test
npm run lint
npm run typecheck
```

## Layout

```
app/          pages, components, composables and the pure UI logic in app/utils
shared/       the Article type, the tag vocabulary and the source registry: one source of truth
pipeline/     fetch, normalize, deduplicate, tag, filter, merge
server/       the two read-only API routes over data/articles.json
data/         articles.json, written by the pipeline
test/         Vitest unit tests with local feed fixtures
docs/         the design and plan of every stage
```

`CLAUDE.md` holds the working agreement for this repository.

## Credits

Built by [Giovanni Manara](https://giovannimanara.dev). Article titles, excerpts and links belong to their sources.
