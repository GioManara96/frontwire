# Tappa 6 — Piano di lavoro

> **Chi esegue:** Claude, con il via di Giovanni già dato per creare progetto, collegamento Git e dominio su Vercel. Il record DNS su Cloudflare lo aggiunge Giovanni. I passi usano le checkbox (`- [ ]`) per tenere traccia dell'avanzamento.

**Obiettivo:** Frontwire online su `frontwire.giovannimanara.dev`, aggiornato a ogni push su `main`.

**Specifica:** `docs/megipowers/specs/2026-09-15-tappa-6-vercel-design.md`

---

### Task 1 — Progetto e collegamento Git · **Claude**

- [ ] `vercel link` crea il progetto `frontwire` e collega la cartella (`.vercel/` resta fuori da git).
- [ ] `vercel git connect` verso `GioManara96/frontwire`; produzione su `main`.

### Task 2 — Primo deploy · **Claude**

- [ ] Deploy di produzione, build verde, sito raggiungibile su `*.vercel.app`: archivio, filtri, dettaglio, 404.

### Task 3 — Dominio · **Claude**, poi **Giovanni**

- [ ] **Claude:** `vercel domains add frontwire.giovannimanara.dev frontwire`, e il record richiesto.
- [ ] **Giovanni:** su Cloudflare, `CNAME frontwire` verso quel valore, **DNS only**.
- [ ] **Claude:** dominio verificato, HTTPS valido.

### Task 4 — Meta social · **Claude**

- [ ] `og:image` assoluto e `og:url` in `nuxt.config.ts`.
- [ ] Commit: `feat(seo): use absolute URLs in the social meta tags`

### Task 5 — Documentazione · **Claude**

- [ ] `CLAUDE.md` aggiornato. Commit: `docs: update CLAUDE.md after stage 6`

### Task 6 — Rilascio · con il via di Giovanni

- [ ] Merge in `staging` e `main`, push: il deploy parte da solo dal push.
- [ ] Sito vero aggiornato con i meta nuovi.
