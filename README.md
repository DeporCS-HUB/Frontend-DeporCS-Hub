# Depor CS HUB Frontend

## Program workspace — 10 October 2026

Dashboard now shows operational Proker/UKOR progress, upcoming milestones, follow-up tasks and Staff contributions. The Programs page supports multiple PJ accounts; assigned Staff can update their activity status, percentage and progress notes. BPH retains full editing and PJ assignment. Unknown progress remains blank instead of being treated as zero. See [program workspace](docs/program-workspace.md).


React 19 + Vite. Main screens use the companion Java 21/Spring Boot API in `DeporCS-HUB/Backend-DeporCS-Hub`; no dummy department records are used.


## Current department roles

The UI uses **BPH** (management) and **Staff** (executing members). The backend returns a trusted departmentRole while keeping stored legacy profile.role values compatible with existing accounts and RLS: staff/admin -> BPH, member -> Staff. The development directory contains 4 BPH and 13 Staff accounts using `name@depor.com`; business-data population remains deferred. See [role adjustment](https://github.com/DeporCS-HUB/Backend-DeporCS-Hub/blob/main/docs/role-adjustment.md) for permissions and rollout.

## Depor interface

The interface uses the user's black, charcoal, navy and muted red palette in `src/styles.css`. Compact headings, flat panels, Indonesian navigation and readable dark charts replace the decorative dashboard banner. Forms and management actions remain available on mobile; collapsed navigation keeps accessible labels. Typography uses system fonts, and routes/charts retain lazy loading and the bounded in-memory API cache. The typographic D mark is an application placeholder, not an official Depor logo.

## Run locally

Use Node 22+ for frontend tooling only. Start the Java backend on port 8080 with **development** Supabase configuration, apply its migration, and create development Auth accounts before testing real login.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` to `http://localhost:8080`; change `API_PROXY_TARGET` in your development environment if needed. The backend's exact allowed origin must include `http://localhost:3000`; local HTTP requires `APP_COOKIE_SECURE=false`.

`VITE_API_URL` is optional; default `/api`. For a separately hosted API, set it to that service's HTTPS URL including `/api`. Every `VITE_*` value becomes public build output. The frontend needs **no Supabase key**, service role key, database credentials, or JWT signing secret. Keep sensitive environment values only in the backend's secure settings.

## Main flows

- Login uses backend/Supabase Auth; protected routes wait for session restoration. Access tokens exist only in memory. Refresh tokens are HttpOnly cookies managed by the backend, with synchronized refresh and one retry after a 401. Expired sessions return to login.
- Dashboard totals and current-year charts come from the database RPC. No made-up event counts, attendance, trends, or notifications are shown.
- BPH can create, edit, delete, and change status for programs, finance transactions, and inventory. Roles come from the backend and are also enforced by backend/RLS.
- Staff can read department data and create/update/delete tasks according to ownership. BPH can assign tasks to other profiles. Task statuses can be changed by select or drag/drop; the board changes only after a successful API write.
- All collections have loading, empty, error, retry, and pagination controls. Search/status filters apply to the current page (100 rows). Linked form choices fetch subsequent pages as needed. Successful writes refresh both lists and dashboard summaries; failed writes display errors and retain server-confirmed data.
- Program deletion can return 409 when tasks/transactions still reference it. Handle those records first; the UI does not silently cascade them.

- Events lists real schedules and venue/permit statuses. BPH can create, edit, and delete events linked to programs; Staff have read-only controls. Search and permit filters apply to the current page. Staff record venue confirmations manually; the app does not send applications or issue permits.
- Settings saves the signed-in account's display name through `PUT /profiles/me`. The header updates only after a successful write, and session restoration loads the saved name. Role and activation cannot be edited.

Apply both backend migrations, including `20261008154204_events_profiles.sql`, before using Events or profile editing.

Team is a live read-only profile directory. Invitations, role editing, organization structure, attendance, external permit approval workflows, and language/theme/notification preferences are not implemented. QR scanning, files/reports, and notification delivery are not implemented.

## Build and verify

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:browser
```

The suite has **22 unit tests** covering API/session refresh concurrency, expiry, failed mutations, pagination, logout, role compatibility and cache invalidation/account isolation. **15 Playwright browser tests** cover login/routing, CRUD and reload, failed writes, BPH/Staff permissions, profile editing, cached navigation, desktop collapsed navigation and mobile forms at 375 px. Build, lint, unit tests and browser tests pass locally. Desktop/mobile screenshots are checked manually. Browser tests use a **mocked API**; they do not certify live Supabase login, hosted persistence or browser cookie behavior.

If Chromium is already installed, `PLAYWRIGHT_CHROME_PATH` can point to its executable. CI runs build/lint/unit and browser tests. Charts and routes load in separate chunks; the initial app bundle stays near 264 kB before gzip. No external font request or new dependency is added for the Depor theme.

The authorized Free development project `dajpnhkutkhgxwkjzvpg` has both migrations applied and 17 active confirmed Auth accounts (4 BPH, 13 Staff) using `name@depor.com`. The two original test accounts, profiles, identities and sessions have been deleted. Original roster UUIDs/passwords are preserved. The user-supplied activity roster is now populated in development.

Earlier backend evidence: **42 Java tests and 49 real Auth/Java/PostgREST checks** with the original test accounts covered CRUD, persistence, RLS, profile edits, refresh rotation and logout. This is historical evidence, not a retest of the current roster. See CODEX_HANDOFF.md and the [backend validation report](https://github.com/DeporCS-HUB/Backend-DeporCS-Hub/blob/main/docs/live-development-validation.md).

## Cloud startup

- `render.yaml` defines a static build: `npm ci && npm run build`, publish `dist`, with SPA routes. Set public `VITE_API_URL` at build time and exact HTTPS CORS origins on the Java API. This file does not create a deployed service or install secrets.
- For unrelated frontend/backend domains, the refresh cookie needs `APP_COOKIE_SECURE=true` and `APP_COOKIE_SAME_SITE=None`. Browser third-party-cookie policies can still block it; prefer a same-origin proxy or same-site custom domains.
- The included Dockerfile runs Vite's build in a Node build stage, then serves static files with nginx. Set runtime `API_PROXY_TARGET` to the private **Java backend** origin, without a trailing slash, and `PORT` (default 8080). nginx forwards `/api` unchanged and serves SPA routes. Leave `VITE_API_URL` unset for this model. The backend should allow the public frontend origin and use secure cookies behind HTTPS.

The Docker frontend uses Node only to compile React/Vite. All backend runtime and API business logic use Java.

## Vercel hosting

The repository is public and PR #1 is merged. vercel.json defines the Vite install/build/output and SPA rewrite. Set **VITE_API_URL to the real backend HTTPS origin plus /api** before the Vercel build; missing configuration fails the build. The SPA rewrite is not an API proxy. No Supabase key belongs in the frontend.

Use only the existing Hobby/$0 account; do not provision paid resources. The frontend is https://depor-cs-hub-web.vercel.app and the backend is https://depor-cs-hub-api.vercel.app. Merge/deployment is user-authorized; deployment status is verified through GitHub/Vercel commit checks. Real hosted browser acceptance remains separate from mocked tests. Follow the [backend Vercel runbook](https://github.com/DeporCS-HUB/Backend-DeporCS-Hub/blob/main/docs/vercel-deployment.md) for CORS, secure refresh cookies and deployment verification.
