# German Articles Trainer

Practice German noun genders — **der, die or das** — one noun at a time, by CEFR level (A1–B2), with
Croatian translations.

Built on the **MERN stack**: **MongoDB** (hosted on MongoDB Atlas) as the database, **Express** and
**Node.js** for the API, and **React** for the frontend.

The app is deliberately small, but it is built and documented the way a production service would be:
explicit trust boundaries, validated input, least-privilege database access, reproducible data, and a
written record of the trade-offs that were accepted rather than silently ignored.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [API](#api)
- [Data model and seeding](#data-model-and-seeding)
- [Frontend design notes](#frontend-design-notes)
- [Security](#security)
- [Configuration](#configuration)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Quality and verification](#quality-and-verification)
- [Known limitations and roadmap](#known-limitations-and-roadmap)

---

## Features

- **Level picker** — A1, A2, B1, B2 or all levels, shown instantly; an empty level says so and points
  back to the picker.
- **Quiz loop** — a random noun with its translation; the same noun never appears twice in a row.
- **One answer per question** — the choice is locked, the correct article is highlighted, and the
  result is shown as text, not only colour.
- **Accessible by default** — live region for results, `aria-pressed` / `aria-disabled` on answers,
  `lang="de"` on German words, `lang="hr"` on the page.
- **Resilient networking** — loading and error states with retry; stale responses can never
  overwrite newer ones.
- **Shareable** — Open Graph / Twitter tags, OG image, icons and a web manifest.

---

## Architecture

```mermaid
flowchart LR
  B[Browser] -->|static assets| F[Vercel CDN<br/>Vite build]
  B -->|GET /api/noun/*<br/>CORS| A[Vercel Function<br/>Express API]
  A -->|read-only user<br/>TLS| D[(MongoDB Atlas M0)]
  S[npm run seed<br/>developer machine] -->|readWrite user| D
  W[data/words.json] --> S
```

Two independent Vercel projects from one repository:

| Part     | Runs as                                                         | Talks to                   |
| -------- | --------------------------------------------------------------- | -------------------------- |
| Frontend | Static files on Vercel's CDN                                    | API only (enforced by CSP) |
| Backend  | One Vercel Function wrapping the Express app (`module.exports`) | MongoDB Atlas              |
| Data     | `beckend/data/words.json` in git, pushed to Atlas by a script   | —                          |

The API is **read-only**: it exposes three `GET` endpoints and accepts no request bodies. The only
write path into the database is the seed script, run by a developer with a separate, privileged user.

**Serverless specifics.** The Mongo connection is cached at module scope (`config/database.js`) so warm
invocations reuse it. A failed connect clears the cache, so one bad cold start does not poison the
instance until Vercel recycles it. `app.listen` runs only when `VERCEL` is not set.

---

## Tech stack

| Layer    | Choice                                | Why                                                              |
| -------- | ------------------------------------- | ---------------------------------------------------------------- |
| Frontend | React 19, Vite 5, MUI 6, SCSS modules | Vite replaced Create React App (unmaintained, 65 audit findings) |
| HTTP     | axios                                 | Cancellation via `AbortSignal`, timeouts, uniform error shape    |
| Backend  | Node.js ≥ 20, Express 4, Mongoose 8   | Zero-config on Vercel; schema validation shared by API and seed  |
| Security | helmet, cors, Vite-injected CSP       | Headers on both origins; CSP tied to the configured API URL      |
| Database | MongoDB Atlas M0                      | Free tier; the dataset is a few hundred documents                |
| Tooling  | ESLint 9 (flat config), Prettier 3    | One command each: `npm run lint`, `npm run format:check`         |

Vite is pinned to **5.x** on purpose: Vite 6+ dropped Node 21, which the development machine still
runs. See [Known limitations](#known-limitations-and-roadmap).

---

## Project structure

```
├── beckend/
│   ├── config/database.js     cached Mongo connection for serverless
│   ├── constants/nouns.js     LEVELS and ARTICLES, shared by model and routes
│   ├── data/words.json        source of truth for the word list
│   ├── models/Noun.js         Mongoose schema (enums, required fields, unique id)
│   ├── routes/Noun.route.js   /levels and /random, input validation
│   ├── scripts/seed.js        validated, idempotent upsert of words.json
│   └── server.js              middleware order, error handling, Vercel export
└── frontend/
    ├── public/                icons, OG image, manifest, robots.txt
    ├── src/
    │   ├── config.js          API_URL, API_TIMEOUT_MS
    │   ├── constants.js       ARTICLES, STATUS
    │   ├── services/          API client
    │   ├── components/quiz/   LevelPicker, Quiz and their shared styles
    │   └── pages/Home/        Home — picks between the two
    ├── vercel.json            security headers for the static site
    └── vite.config.js         build-time CSP and SEO tags, `@/` alias
```

---

## API

Base path: `/api`. All responses are JSON with a `status` field (`"Success"` or `"Error"`).

### `GET /api/health`

Liveness only — does **not** touch the database, so it stays cheap and cannot be used to probe Atlas.

```json
{ "status": "Success" }
```

### `GET /api/noun/levels`

Word count per level, always in `A1 → B2` order and always including every level (missing ones are `0`).
The frontend fires it on the start screen only as a warm-up — it wakes the function and opens the database
connection while the user is still choosing. The picker itself does not wait for it.

```json
{
  "status": "Success",
  "levels": [
    { "level": "A1", "count": 60 },
    { "level": "A2", "count": 60 },
    { "level": "B1", "count": 57 },
    { "level": "B2", "count": 55 }
  ]
}
```

### `GET /api/noun/random?level=&exclude=`

| Param     | Required | Rule                              | Purpose                                 |
| --------- | -------- | --------------------------------- | --------------------------------------- |
| `level`   | no       | one of `A1`, `A2`, `B1`, `B2`     | restrict to one level                   |
| `exclude` | no       | positive safe integer (`/^\d+$/`) | id currently on screen — avoids repeats |

```json
{
  "status": "Success",
  "noun": { "id": 24, "article": "das", "noun": "Buch", "translation": "knjiga", "level": "A1" }
}
```

Sampling uses `$sample` inside an aggregation. If excluding the current id leaves nothing (a level with
one word), the endpoint repeats the word rather than returning 404.

### Errors

| Status | When                                     | Body                                                          |
| ------ | ---------------------------------------- | ------------------------------------------------------------- |
| 400    | invalid `level` or `exclude`             | `{ "status": "Error", "message": "level must be one of: …" }` |
| 404    | unknown route                            | `{ "status": "Error", "message": "Not found" }`               |
| 404    | no nouns match the filter                | `{ "status": "Error", "message": "No nouns found" }`          |
| 500    | anything unexpected (e.g. database down) | `{ "status": "Error", "message": "Server error" }`            |

The 500 body is intentionally generic; details go to the server log only.

---

## Data model and seeding

```js
{
  id:          Number,                          // required, unique — the public identifier
  article:     'der' | 'die' | 'das',           // required, enum
  noun:        String,                          // required
  translation: String,                          // required (Croatian)
  level:       'A1' | 'A2' | 'B1' | 'B2',       // required, enum, indexed
}
```

- Mongo's `_id` is a storage detail and is **never returned** — responses use an explicit projection.
- `LEVELS` and `ARTICLES` live in one module (`constants/nouns.js`) and drive both the schema enums and
  the route validation, so the two cannot drift apart.

**`data/words.json` is the source of truth**; the database is a copy of it. `npm run seed`:

1. drops the exported `_id` from each entry,
2. validates **every** entry against the Mongoose schema and aborts before writing if any fail,
3. rejects duplicate `id` or `noun` values (a repeated id would silently overwrite a word),
4. creates indexes and runs a single `bulkWrite` of upserts keyed by `id`.

The run is idempotent — repeat it as often as you like — and it reports inserted / updated / unchanged
counts. It never deletes: a word removed from the JSON stays in the database until removed by hand.

---

## Frontend design notes

- **No races.** Every fetch gets an `AbortController`, aborted in the effect cleanup. A slow response for
  an old question cannot replace a newer one, and React StrictMode's double-invoke is harmless.
- **No repeats.** The id on screen is kept in a ref and sent as `exclude`; a ref, because changing it
  must not trigger another fetch.
- **Locked answers without losing feedback.** After answering, clicks are ignored and `aria-disabled` is
  set, instead of `disabled` — disabled MUI buttons turn grey and would hide the red/green marking.
- **Instant start screen.** The level buttons come from a frontend copy of `LEVELS`, not from the API,
  so a cold start never blocks the first screen. A level with no nouns surfaces as a `404` from
  `/random`, which the quiz shows as "pick another level" rather than a retryable error.
- **State shape.** `Home` holds `selection` as an object, because `level: undefined` ("all levels") is a
  valid choice and cannot double as "nothing chosen yet".
- **Styling.** Colours and spacing are CSS custom properties in `index.css`; SCSS modules only read them.
  `StyledEngineProvider injectFirst` lets module classes override MUI without `!important`. On screens
  ≥ 1024 px the whole card is scaled with `zoom: 1.25`, because MUI sizes in `rem` and per-token scaling
  would leave MUI components behind.
- **Build-time HTML.** `vite.config.js` injects the CSP (needs the API origin) and the absolute-URL SEO
  tags — `canonical`, `og:url`, `og:image` (need the public origin). Both are build-only plugins.

---

## Security

### Trust boundaries

Everything from the browser is untrusted: query strings, origins, request rates. The frontend is
untrusted from the API's point of view — client-side behaviour (excluding ids, disabling buttons) is UX,
never a control.

### Controls in place

| Threat                                 | Mitigation                                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NoSQL operator injection               | `query parser: 'simple'` keeps `?level[$ne]=A1` a string, not an object; `level` is whitelisted against `LEVELS`; `exclude` must match `/^\d+$/` and be a safe integer. |
| Mass assignment / unexpected writes    | No write endpoints, no body parsers, CORS limited to `GET`.                                                                                                             |
| Database credential abuse              | The API uses a **read-only** Atlas user. Writes need a separate `readWrite` user that never leaves the developer machine.                                               |
| Leaking internals                      | Generic 500 body; `_id` and `__v` never returned; `x-powered-by` removed by helmet.                                                                                     |
| XSS / injected scripts on the frontend | CSP: `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`; `connect-src` allows only the configured API origin. React escapes all output.  |
| Clickjacking                           | `X-Frame-Options: DENY` on the frontend (`vercel.json`); `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` on the API (helmet).                                |
| MIME sniffing, referrer leaks          | `X-Content-Type-Options: nosniff` on both origins; `Referrer-Policy: no-referrer` on the API, `strict-origin-when-cross-origin` on the frontend.                        |
| Transport                              | HTTPS on Vercel, HSTS from helmet on the API, TLS to Atlas (`mongodb+srv`).                                                                                             |
| Secrets in git                         | `.env` is git-ignored everywhere (`**/.env`); only `.env.example` files are committed. The frontend holds no secrets — `VITE_*` values are public by design.            |
| Vulnerable dependencies                | `npm audit` is clean for the backend and for the frontend's runtime dependencies (see accepted risks for dev tooling).                                                  |

### Accepted risks

These are known and deliberate for a free, public, read-only showcase. Each has a clear upgrade path.

| Risk                         | Why it is accepted                                                                                                                                     | Upgrade path                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| No rate limiting             | An in-memory limiter is ineffective across serverless instances. Worst case is exhausting the free Atlas tier; no data can be read that is not public. | Vercel Firewall rate-limit rule, or Upstash-backed limiter |
| Atlas allows `0.0.0.0/0`     | Vercel Functions have no fixed egress IPs on the free plan. Compensated by the read-only user and a strong, unique password.                           | Static egress IPs / private networking on a paid plan      |
| CORS falls back to `*`       | If `CORS_ORIGIN` is unset the API is open. CORS is not access control here — the data is public and no credentials are sent — so this is hygiene only. | Always set `CORS_ORIGIN` in production                     |
| `style-src 'unsafe-inline'`  | MUI/Emotion injects `<style>` tags at runtime. Script execution stays locked to `'self'`.                                                              | Emotion nonce via a server-rendered setup                  |
| Vite 5 dev-server advisories | Two `npm audit` findings (esbuild / Vite ≤ 6.4.2) affect only `npm run dev` on a developer machine — nothing in the deployed bundle.                   | Upgrade Node to 22 LTS, then Vite to the current major     |

### Reporting

Found something? Please open a private security advisory on the repository rather than a public issue.

---

## Configuration

### Backend — `beckend/.env`

| Variable      | Required      | Example                                                           | Notes                            |
| ------------- | ------------- | ----------------------------------------------------------------- | -------------------------------- |
| `MONGO_URL`   | yes           | `mongodb+srv://USER:PASS@cluster.example.mongodb.net/gapdatabase` | Read-only user in production     |
| `CORS_ORIGIN` | in production | `https://your-frontend.vercel.app`                                | Comma-separated; unset means `*` |
| `PORT`        | no            | `4001`                                                            | Local only; Vercel ignores it    |

### Frontend — `frontend/.env`

| Variable       | Required      | Example                       | Notes                                                                  |
| -------------- | ------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `VITE_API_URL` | in production | `https://your-api.vercel.app` | No trailing slash. **Baked in at build time** — change means redeploy. |
| `SITE_URL`     | no            | `https://der-die-das.example` | Only for a custom domain; on Vercel the production domain is used.     |

`VITE_*` variables end up in the public bundle. Never put a secret in one.

---

## Running locally

Requires **Node 20+**.

```sh
# Backend — http://localhost:4001
cd beckend
cp .env.example .env      # set MONGO_URL
npm install
npm run seed              # needs a readWrite database user
npm run dev

# Frontend — http://localhost:3000
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4001
npm install
npm run dev
```

| Package    | Scripts                                                     |
| ---------- | ----------------------------------------------------------- |
| `frontend` | `dev`, `build`, `preview`, `lint`, `format`, `format:check` |
| `beckend`  | `dev`, `start`, `seed`, `format`, `format:check`            |

The dev server does not apply the CSP (it would block Vite's inline HMR preamble). Use
`npm run build && npm run preview` to test the production HTML.

---

## Deployment

Free tier end to end: MongoDB Atlas M0 and two Vercel Hobby projects.

1. **Atlas users.** Create two database users:
   - `api-read` — built-in role `read` on `gapdatabase`, used by Vercel;
   - `seed-write` — `readWrite` on `gapdatabase`, used only from your machine.

   Use long generated passwords. Network Access: `0.0.0.0/0` (see [accepted risks](#accepted-risks)).

2. **Seed** locally with the `seed-write` connection string: `npm run seed`.
3. **Backend** — new Vercel project, Root Directory `beckend`. Environment: `MONGO_URL` (the `api-read`
   string). Deploy, then check `/api/health` and `/api/noun/levels`.
4. **Frontend** — new Vercel project, Root Directory `frontend`, framework preset Vite. Environment:
   `VITE_API_URL` = backend URL. Deploy.
5. **Lock CORS** — set `CORS_ORIGIN` on the backend to the frontend URL and redeploy the backend.
6. **Verify** — no CORS or CSP errors in the browser console; `curl -I` both origins and check the
   security headers; paste the frontend URL into a link-preview checker to confirm the OG card.

---

## Quality and verification

- `npm run lint` (ESLint flat config with React and Hooks rules) and `npm run format:check` (Prettier) in
  both packages.
- `npm audit` for both packages; findings are either fixed or listed under accepted risks.
- End-to-end check of the current version (scripted, headless Chrome, not yet part of the repo): the
  production build served with `vite preview` against the real API — level picker loads, an answer locks
  the card and announces the result, 15 consecutive questions without a repeat, back to the picker, and
  an empty browser console (no CSP violations).
- API checks with `curl`: valid filters, `?level[$ne]=A1` → 400, unknown level → 400, unknown route → 404,
  expected headers present.

---

## Known limitations and roadmap

- **No automated test suite yet.** Next step: Vitest + Testing Library for `Quiz` / `LevelPicker`, and
  Supertest for the API validation paths, run in CI with lint and build.
- **CI** — GitHub Actions running `lint`, `format:check`, `build` and `npm audit --omit=dev` on each push.
- **Node 22 LTS** on the development machine, then Vite to the current major (clears the dev-only audit
  findings).
- **Rate limiting** at the edge once the app sees real traffic.
- **Content** — more nouns per level, C1/C2, plural forms.
- **Progress** — per-session score and a review queue for missed nouns (client-side, no accounts).

**Viel Erfolg! 🇩🇪**
