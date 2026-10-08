# Depor CS HUB Frontend

React 19 + Vite. Main screens use the companion Java 21/Spring Boot API in `DeporCS-HUB/Backend-DeporCS-Hub`; no dummy department records are used.

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
- Staff/admin can create, edit, delete, and change status for programs, finance transactions, and inventory. Roles come from the backend and are also enforced by backend/RLS.
- Members can read department data and create/update/delete tasks according to ownership. Staff can assign tasks to other profiles. Task statuses can be changed by select or drag/drop; the board changes only after a successful API write.
- All collections have loading, empty, error, retry, and pagination controls. Search/status filters apply to the current page (100 rows). Linked form choices fetch subsequent pages as needed. Successful writes refresh both lists and dashboard summaries; failed writes display errors and retain server-confirmed data.
- Program deletion can return 409 when tasks/transactions still reference it. Handle those records first; the UI does not silently cascade them.

- Events lists real schedules and venue/permit statuses. Staff/admin can create, edit, and delete events linked to programs; members have read-only controls. Search and permit filters apply to the current page. Staff record venue confirmations manually; the app does not send applications or issue permits.
- Settings saves the signed-in account's display name through `PUT /profiles/me`. The header updates only after a successful write, and session restoration loads the saved name. Role and activation cannot be edited.

Apply both backend migrations, including `202610080002_events_profiles.sql`, before using Events or profile editing.

Team is a live read-only profile directory. Invitations, role editing, organization structure, attendance, external permit approval workflows, and language/theme/notification preferences are not implemented. QR scanning, files/reports, and notification delivery are not implemented.

## Build and verify

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:browser
```

Ten Node test-runner tests cover API/session refresh concurrency, expiry, failed mutations, pagination, network errors, and logout failure. Seven Playwright tests exercise login/protected routing, program CRUD and reload, failed task updates, member controls, finance/inventory forms, event CRUD/failure states, member event controls, and profile save/reload/failure states **against a mocked API**. They do not certify live Supabase login or database persistence. Local browser execution was blocked by the managed runtime denying Chromium’s Unix socket creation; the initial four browser tests passed in GitHub CI. The expanded suite is also run in GitHub CI.

If Chromium is already installed, `PLAYWRIGHT_CHROME_PATH` can point to its executable. CI runs build/lint/unit tests and browser tests. The lockfile pins installed dependencies. Vite's build currently reports a non-fatal large-chunk advisory for the chart library; code splitting remains an optimization.

Live acceptance requires an isolated Supabase development project, migrated schema, and member/staff accounts. Verify login → dashboard → create/edit/delete → task status → reload → session refresh → logout using those accounts. No real Supabase credentials or accounts were available in the implementation runtime; no production migration or deployment was performed.

## Cloud startup

- `render.yaml` defines a static build: `npm ci && npm run build`, publish `dist`, with SPA routes. Set public `VITE_API_URL` at build time and exact HTTPS CORS origins on the Java API. This file does not create a deployed service or install secrets.
- For unrelated frontend/backend domains, the refresh cookie needs `APP_COOKIE_SECURE=true` and `APP_COOKIE_SAME_SITE=None`. Browser third-party-cookie policies can still block it; prefer a same-origin proxy or same-site custom domains.
- The included Dockerfile runs Vite's build in a Node build stage, then serves static files with nginx. Set runtime `API_PROXY_TARGET` to the private **Java backend** origin, without a trailing slash, and `PORT` (default 8080). nginx forwards `/api` unchanged and serves SPA routes. Leave `VITE_API_URL` unset for this model. The backend should allow the public frontend origin and use secure cookies behind HTTPS.

The Docker frontend uses Node only to compile React/Vite. All backend runtime and API business logic use Java.
