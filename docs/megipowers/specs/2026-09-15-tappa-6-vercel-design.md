# Tappa 6 — Vercel e sottodominio

Data: 2026-09-15

## Obiettivo e confini

Mettere Frontwire online su `frontwire.giovannimanara.dev`, con un deploy automatico a ogni push su `main`: così ogni import del bot aggiorna il sito da solo.

**Dentro:** progetto Vercel collegato al repo GitHub, dominio, record DNS su Cloudflare, URL assoluti nei meta social, verifica sul sito vero, documentazione.

**Fuori:** preferiti (tappa successiva), analytics, qualsiasi servizio a pagamento.

## Com'è fatto oggi

Verificato il 2026-09-15:

- L'account Vercel (`giovannis-projects-bc3c0435`, piano Hobby) ospita già `portfolio-2026` (`giovannimanara.dev`) ed `echoes` (`echoes.giovannimanara.dev`). Il dominio è registrato su Vercel come dominio esterno; i nameserver sono di Cloudflare (`luciana` e `newt.ns.cloudflare.com`).
- Portfolio ed echoes rispondono direttamente da Vercel (`server: Vercel`, nessun `cf-ray`): su Cloudflare i loro record sono "DNS only".
- `vercel.json` di frontwire è già identico a quello del portfolio: `NITRO_PRESET=static nuxt generate`, output `.output/public`, `framework: null`. Nel repo vince sulle impostazioni della dashboard.
- `frontwire.giovannimanara.dev` non esiste ancora.

## Decisioni

- **Progetto creato da Claude con la CLI** (`vercel link`), non dalla dashboard, con il via di Giovanni. Nome `frontwire`, Node 24, stesso account dei fratelli.
- **Collegamento Git** a `GioManara96/frontwire`, branch di produzione `main`. Ogni push su `main` fa un deploy di produzione, compresi i commit del bot (al massimo 4 al giorno, ben sotto i limiti di Hobby). Gli altri branch fanno anteprime, gratuite. I push del bot con `GITHUB_TOKEN` non avviano altri workflow, ma l'integrazione Git di Vercel reagisce al push in sé, quindi il sito si aggiorna.
- **Dominio** `frontwire.giovannimanara.dev` sul progetto. **Record DNS su Cloudflare, lo aggiunge Giovanni** (Claude non ha accesso): `CNAME frontwire` verso il valore indicato da Vercel, **DNS only** (nuvola grigia). Col proxy di Cloudflare Vercel non riesce a emettere e rinnovare il certificato.
- **Meta social con URL assoluti:** `og:image` diventa `https://frontwire.giovannimanara.dev/og.png` e si aggiunge `og:url`. Le piattaforme social non risolvono i percorsi relativi.
- Resta `vercel.json` (niente `vercel.ts`): la configurazione è di tre righe ed è la stessa del portfolio.

## Errori e casi limite

| Caso                                    | Comportamento                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| L'app GitHub di Vercel non vede il repo | `vercel git connect` fallisce: Giovanni dà accesso al repo all'app Vercel su GitHub, poi si ripete                  |
| Record DNS assente o col proxy attivo   | Il dominio resta "Invalid Configuration" su Vercel e HTTPS non parte; il sito resta raggiungibile su `*.vercel.app` |
| Build fallita su Vercel                 | Il deploy precedente resta online; si legge il log con `vercel inspect --logs`                                      |
| L'Action committa dati non validi       | Non succede: il test d'integrità blocca il commit prima del push, quindi prima del deploy                           |

## Verifica

- Primo deploy di produzione verde; il sito risponde su `*.vercel.app` e, dopo il DNS, su `https://frontwire.giovannimanara.dev` con certificato valido.
- Sul sito vero: archivio, filtri (anche da link diretto), dettaglio di una release, 404.
- Il deploy successivo a un commit su `main` parte da solo (push di fine tappa, poi il primo commit del bot).

## Documentazione

`CLAUDE.md`: architettura (progetto collegato, deploy a ogni push su `main`), stack (niente più "da configurare"), il record DNS e la regola "DNS only".
