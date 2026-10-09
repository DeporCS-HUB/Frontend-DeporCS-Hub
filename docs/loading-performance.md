# Loading performance — 9 October 2026

The previous frontend production build put all routes and Recharts into one 694.82 kB JavaScript asset (205.97 kB gzip). Login therefore downloaded chart code it did not use.

Routes now load on demand. Charts have their own lazy boundary so dashboard totals, navigation, transactions and the welcome panel can render while chart code loads. The system font stack removes the external Google Fonts CSS request. The login form is visible while session restoration is pending; submission remains disabled until that check completes, and protected pages still require a confirmed session.

Identical GET requests share one in-flight request and reuse successful data for 30 seconds. This cache stays in browser memory, holds at most 100 paths, and excludes authentication, errors, mutations and custom fetch options. It clears after successful writes and when the account or trusted roles change, including logout. A pending read from a previous account is rejected and cannot populate the new cache. Same-account token rotation does not discard fresh data. Explicit retry bypasses cached data.

Backend CORS preflight responses allow the browser to reuse permission checks for one hour, with the existing exact origin allowlist and credentials rules. Actual requests still validate the current Supabase user and active trusted profile every time. No server principal/token cache, hosted database migration, seed, paid feature, warmup job or hosting upgrade is introduced.

Tests cover TTL, deduplication, bounded memory, failed requests, invalidation races, account/role isolation, mutation freshness, visible pending-session login, and allowed/denied CORS preflight. Run npm run build, npm run lint, npm test and npm run test:browser; backend runs mvn verify and the existing PostgreSQL RLS suite in GitHub Actions. Local execution remains offline. Build measurements and CI/deployment results belong in the associated PRs; mocked browser tests do not establish live network latency.
