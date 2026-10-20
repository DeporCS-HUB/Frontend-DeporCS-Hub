# Loading performance — 9 October 2026

The previous frontend production build put all routes and Recharts into one 694.82 kB JavaScript asset (205.97 kB gzip). Login therefore downloaded chart code it did not use.

Routes now load on demand. Charts have their own lazy boundary so dashboard totals, navigation, transactions and the welcome panel can render while chart code loads. The system font stack removes the external Google Fonts CSS request. The login form is visible while session restoration is pending; submission remains disabled until that check completes, and protected pages still require a confirmed session.

Identical GET requests share one in-flight request and reuse successful data for 30 seconds. This cache stays in browser memory, holds at most 100 paths, and excludes authentication, errors, mutations and custom fetch options. It clears after successful writes and when the account or trusted roles change, including logout. A pending read from a previous account is rejected and cannot populate the new cache. Same-account token rotation does not discard fresh data. Explicit retry bypasses cached data.

Backend CORS preflight responses allow the browser to reuse permission checks for one hour, with the existing exact origin allowlist and credentials rules. Actual requests still validate the current Supabase user and active trusted profile every time. No server principal/token cache, hosted database migration, seed, paid feature, warmup job or hosting upgrade is introduced.

Tests cover TTL, deduplication, bounded memory, failed requests, invalidation races, account/role isolation, mutation freshness, visible pending-session login, and allowed/denied CORS preflight. Run npm run build, npm run lint, npm test and npm run test:browser; backend runs mvn verify and the existing PostgreSQL RLS suite in GitHub Actions. Local execution remains offline. Build measurements and CI/deployment results belong in the associated PRs; mocked browser tests do not establish live network latency.

## Measured iteration — 20 October 2026

Baseline frontend `f831074`, backend `4f5c7ee`. The visual Lighthouse score was already green; the actionable problem was waiting for workspace data and issuing eight independent board/directory reads.

| Metric (median of 3 runs) | Before | After | Budget |
| --- | ---: | ---: | ---: |
| Dashboard data ready | 2343 ms | 2276 ms | ≤2500 ms |
| Program list data ready | 2267 ms | 2196 ms | ≤2500 ms |
| Task board, all 60 visible cards ready | 2748 ms | 2160 ms | ≤2500 ms |
| Cold board API requests, including session refresh | 9 | 3 | ≤3 |
| Warm return to task board | 118 ms | 134 ms | ≤250 ms |
| Initial JavaScript, gzip | 89,467 bytes | 85,497 bytes | ≤88,064 bytes (86 KiB) |
| Lighthouse mobile: login / dashboard / board | 100 / 100 / 100 | 100 / 99 / 98 | ≥90 each |

The board became about 21% faster in this controlled test, with 67% fewer initial API requests. Small dashboard/program timing changes and warm-navigation differences are not evidence of a large speedup. Visual scores remain green; this work does not claim a higher Lighthouse score than baseline.

After medians: mobile LCP login 1366 ms, dashboard 1684 ms, board 1992 ms; TBT 0/0/9 ms; CLS 0.0244/0/0. Full samples and settings: [performance-results.json](performance-results.json).

Method: production build, Chromium 143.0.7499.0, Lighthouse 13.3.0, mobile 375×812, CPU slowdown 4×, network latency 150 ms and throughput 1.6 Mbps. Fixture contains 17 fictional accounts, 14 programs, 100 tasks with long descriptions. API delay is fixed at 400 ms; no real credentials or hosted data are used. HTML/JS/CSS are gzip-served; fixture API bodies are left uncompressed, so this comparison does not credit Java's new JSON gzip. The fixture has no profile photos; real photos add their separately batched request. Data-ready waits for complete chart/table/board content, not just a title or spinner.

Implementation:

- `/tasks/board` returns all five independently paginated columns and global filtered summary in one RLS invoker snapshot; 12 records per column, with descriptions excluded. Detail/Edit fetch a full record; Edit forces a fresh read so a compact card cannot clear the description.
- `/directory` combines only account/program option fields. Both lookups share the same memory cache. Successful writes, refresh and account/role changes retain the existing invalidation boundaries.
- `/dashboard/overview` avoids financial, inventory, description and milestone reads. `/dashboard` remains available for Finance. Read-only hosted checks confirmed equal counts for BPH/Staff; the BPH compact JSON text was 5,753 bytes versus 12,394 (54% smaller). These are database JSON sizes, not HTTP transfer timings.
- Session restoration and static route-code loading start concurrently. Layout and the program's Tasks tab are lazy; route intent preloads code only and respects saveData/2g. Protected data still requires a verified current session and active profile.
- Backend JSON responses ≥1024 bytes use gzip when supported. An embedded-HTTP test verifies decompression and Cache-Control no-store. There is no public data cache, auth TTL cache, paid warmup service or upgrade.

Run `VITE_API_URL=/api npm run build`, install Playwright Chromium, then `npm run test:performance`. CI runs the same gate after functional browser tests. It fails if median data-ready, cold request count, warm return, initial JS or Lighthouse/LCP/TBT/CLS budgets regress. `PLAYWRIGHT_CHROME_PATH` selects an available local test Chromium; the default uses Playwright's installed browser. The benchmark refuses a remote API build so it cannot call a real account backend. Reports are written to ignored `test-results/performance.json`. `PERF_DIST`, `PERF_REPORT` and `PERF_RECORD_ONLY=1` support baseline recording without treating an old build as a passing release.

Limits: this is a reproducible application/fixture benchmark, not a measurement of a real user's device, Supabase Auth login, Vercel container cold start, or authenticated production latency. Those require a suitable real session and field measurements. No real account/password/photo/business records were changed for the benchmark. The development migration creates three read-only invoker functions; hosted RLS read comparisons and disposable security suites are separate evidence.

## Regression check: small program tasks — 20 October 2026

Required task parents, directory kind and legacy classification keep the existing fixture gate passing. Three-run controlled medians: dashboard 2268 ms, programs 2153 ms, tasks 2139 ms; cold API requests 2/3/3 including refresh, warm task return 134 ms, initial JS gzip 85498 bytes. Lighthouse task runs 99/99/99, LCP about 1981 ms, TBT at most 15 ms, CLS 0. Same fixed synthetic API/network/CPU setup; not a hosted account latency claim. Final CI evidence belongs to the release PR.
