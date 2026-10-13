# CLAUDE.md

Yor-Yae-Badminton — a web app for running badminton tournaments (Next.js frontend). The backend is **Strapi** (separate repo), which this app calls over REST.

Backend: `../badminton-service` (Strapi 5.36, repo `github.com/prapot/badminton-service`, branch `develop`). Content types are in `src/api/` (tournament, tournament-player, match, team, team-player, match-player-score, match-history, ranking, season, profile, ...). Custom endpoints such as `POST /api/tournaments/:id/create-endless-match` live there. Local: `http://localhost:1337` · Prod: `http://206.189.88.42:1337`

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build (output: "standalone")
npm run lint         # eslint (flat config, next core-web-vitals + typescript)
npm test             # vitest (watch mode) — use `npx vitest run` for a single run
npx tsc --noEmit     # type check
npm run deploy:prod  # scripts/deploy.sh: build locally → rsync → pm2 reload on the server (refuses to run outside branch develop)
```

Deploy only from the `develop` branch (both repos' `scripts/deploy.sh` enforce this). Work on feature branches, then merge into `develop`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS **v4** (`@tailwindcss/postcss`), `cn()` in `src/shared/utils/utils.ts` (clsx + tailwind-merge)
- Data fetching: `fetch` directly against Strapi, plus `swr` in some hooks
- UI: `lucide-react`, `sweetalert2` (dialogs), `recharts` (history analytics), `qrcode.react`
- Realtime: Pusher — **the backend triggers every event** (`badminton-service/src/utils/realtime.ts`); the frontend only subscribes via the shared client `src/shared/realtime/pusherClient.ts`
- Tests: Vitest + jsdom + Testing Library (`vitest.config.ts`, alias `@` → `src`)

## Architecture

Feature-based layout:

```
src/
  app/                     # routes only — page.tsx is a thin wrapper that renders the feature's *Client component
    api/pusher/trigger/    # the app's only API route
    tournament/[id]/ ...   # login, register, profile, ranking, history/[userId], tournament (list/create/[id])
  features/<feature>/
    components/            # UI
    hooks/                 # data/logic hooks (useXxxData, useXxxForm)
    types.ts
  features/tournaments/    # the largest feature
    components/            # list page + shared badges (RankBadge, SkillBadge, BlockedPartnerModal)
    create-components/ create-hooks/   # 4-step create wizard
    detail-components/ detail-hooks/   # tournament detail page: draw, scoring, knockout, endless mode
    utils/                 # TournamentUtils, KnockoutUtils, skillPrompt
  shared/components/       # Navbar, Footer
```

- Auth: JWT from Strapi `/api/auth/local`, stored in `localStorage` (`jwt`, `user`). `useAuth()` checks expiry and redirects to `/login?redirect=...`. There is no middleware or server-side auth.
- Strapi URL: `NEXT_PUBLIC_STRAPI_BASE_URL` (fallback `http://localhost:1337`)
- Realtime flow: Strapi DB lifecycles (match / tournament / tournament-player) → `tournament-<documentId>` event `changed` with `{ scope: 'matches' | 'tournament' }` (debounced 300ms; a match create/score is `matches`, a match marked done, a delete, or a player/tournament change is `tournament`) → `useTournamentData` refetches only matches or everything. Hidden tabs ignore events and catch up once when they become visible. Strapi fetches must not set `cache: "no-store"` / `"no-cache"`: Chrome then skips its CORS preflight cache, so every request also sends an OPTIONS request (on 2026-10-06 this added about 60% extra requests). Strapi responses have no cache headers, so the default mode always refetches. `createEndlessMatch` additionally sends `user-<id>` `match-alert`. Polling is 60s while Pusher is connected and 7s if it is not; it pauses while the tab is hidden. Env: frontend `NEXT_PUBLIC_PUSHER_KEY`/`NEXT_PUBLIC_PUSHER_CLUSTER`, backend `PUSHER_APP_ID`/`PUSHER_KEY`/`PUSHER_SECRET`/`PUSHER_CLUSTER`
- **By design: local and prod share the same Pusher app/key** (personal project) — do not flag this or suggest a separate dev app
- **By design: anyone can create matches** (`POST /api/tournaments/:id/create-endless-match` is `auth: false`) — do not report this as a security issue
- Tournament modes: knockout (`KnockoutManager`, `BracketView`) and endless/rotation (`EndlessModeManager` + `hooks/useEndlessModeManager.tsx`)

## Conventions

- New pages: keep `app/**/page.tsx` thin and put logic in `features/<name>/`
- Put logic in hooks and keep components presentational (see `useEndlessModeManager` + its test in `hooks/__tests__/`)
- UI text is in Thai; code comments mix Thai and English
- Use the `@/` import alias
- Avoid `any` (lint currently reports 91 cases — do not add more)
- Note: `.gemini/GEMINI.md` mentions Zustand / Jest / Tailwind 3, **which does not match the actual project** (no Zustand, uses Vitest + Tailwind v4). Follow this file.

---

## Project Review (2026-10-13)

State at review time: `tsc` passes ✅ · `vitest` 4/4 passes ✅ (only one test file) · `eslint` ❌ 118 errors / 21 warnings

### 🔴 Critical — fix first

> Update 2026-10-13: the Pusher trigger moved to the backend, the `/api/pusher/trigger` route was removed, and polling was replaced with realtime events. The owner decided to keep the same Pusher key/secret (no rotation); the secret now lives only in the backend `.env` (git-ignored) — note that it is still in this repo's git history.

1. **Pusher secret is hardcoded and committed to git** — `src/app/api/pusher/trigger/route.ts` contains `appId`/`key`/`secret` in plain text, and the repo has a GitHub remote.
   → **Rotate the secret in the Pusher dashboard immediately**, then move it to env (`PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`). The key is also hardcoded in `useMatchNotification.ts`.
2. **`/api/pusher/trigger` has no authentication** — anyone can POST and send a `match-alert` to any `user-<id>` channel with arbitrary content. It should verify the JWT with Strapi first (or have Strapi trigger Pusher itself after the match is created). Also consider private channels (`private-user-<id>`) so others cannot subscribe to someone else's channel.
3. **`.env.production` is committed to git** (it currently holds only the server IP/URL, but is at risk once a secret is added). The `.gitignore` also has a typo, `.env.lcoal` → it should be `.env*.local` / `.env.production`.

### 🟠 Important

4. **Compiled `.js` files sit next to `.ts/.tsx` sources** — `types.js`, `TournamentUtils.js`, `RankBadge.js`, `SkillBadge.js`, `BlockedPartnerModal.js`, `constants/skillLevels.js` (CommonJS output from a stray `tsc` run). They cause confusing module resolution and the 10 `no-require-imports` lint errors → delete them.
5. **Junk files are committed**: `EndlessModeManager.tsx.bak`, `scratch/*.js`, `test_users.js`, `strapi_start*.log`, `.strapi-updater.json`, `.DS_Store` → delete them and add them to `.gitignore`.
6. **The Strapi URL is redeclared in ~22 files** (`const STRAPI_BASE_URL = process.env... || "http://localhost:1337"`) → create a single `src/shared/api/strapi.ts` with a `strapiFetch(path, { jwt })` helper that handles headers/errors in one place.
7. **Production uses plain HTTP to an IP** (`http://206.189.88.42`) → JWTs and passwords travel unencrypted. Use a domain + HTTPS (an `nginx.conf.example` already exists).
8. **Deploy is inconsistent** — there are 3 approaches: `deploy.sh` (git pull `main` on the server, but the working branch is `develop`), `scripts/deploy.sh` (rsync), and a `Dockerfile` (standalone). Also, `ecosystem.config.js` runs `npm start` even though `output: "standalone"` → pick one approach and remove the others.
9. **Unused dependencies**: `styled-components`, `react-router-dom`, `class-variance-authority` (0 imports) → `npm uninstall`.
10. **`next.config.ts` `images.remotePatterns` allows `hostname: '**'`** over both http and https → anyone can use the image optimizer as a proxy. Restrict it to the Strapi host.

### 🟡 Code quality

11. **Lint errors**: `no-explicit-any` ×91, `no-unused-vars` ×15, `react-hooks/set-state-in-effect` ×13, `exhaustive-deps` ×5. The setState-in-effect cases should be reviewed one by one, since they cause extra renders.
12. **Files that are too large**: `useEndlessModeManager.tsx` (785 lines), `EndlessModeManager.tsx` (747), `ParticipantsList.tsx` (495), `MatchSchedule.tsx` (430) → split them into sub-hooks/sub-components. For example, `handleConfirmDraw` and `handleConfirmManualMatch` have nearly identical code (create match + trigger pusher + optimistic busy) and could share one function.
13. **Inconsistent folder structure inside `features/tournaments`**: there are both `hooks/` and `detail-hooks/`/`create-hooks/`, plus `constants.ts` and `constants/` → standardize the structure.
14. **Data fetching mixes `swr` and manual fetch + useState** → standardize on SWR (cache/revalidate/dedupe).
15. **Very few tests** — only `useEndlessModeManager` is tested. Pure logic such as `TournamentUtils`, `KnockoutUtils`, and `getRankInfoFromPoints` should be tested first.
16. **Misc**: `README.md` is still the create-next-app template; `<html lang="en">` while the content is Thai → `lang="th"`; `vitest.config.ts` warns about ESM → rename it to `.mts`.

### ✅ Strengths

- Clear feature-based structure, thin pages, logic separated into hooks
- TypeScript strict and `tsc` passes cleanly
- `useAuth` checks JWT expiry + cross-tab sync + redirect back to the original page
- Dockerfile is a proper multi-stage build with a non-root user
- Knockout + Endless modes, Pusher realtime notifications, and history analytics are fairly complete features

### Suggested fix order

1. Rotate the Pusher secret → move it to env → add auth to the API route
2. Clean up the repo (`.js` duplicates, `.bak`, scratch, logs, `.gitignore`)
3. Create the shared Strapi client + remove unused deps
4. Choose a single deploy approach + HTTPS
5. Fix lint gradually + add tests for utils + split large files
