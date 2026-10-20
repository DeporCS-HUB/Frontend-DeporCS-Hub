# Lighthouse feedback — 20 October 2026

The user supplied an authenticated mobile Lighthouse13.4.1 report from the deployed dashboard. Scores: Performance97, Accessibility98, Best Practices77, SEO92. LCP1.5s, FCP1.4s, TBT0ms, CLS0, SpeedIndex4.6s. Do not publish the raw report or signed photo URLs.

| Finding | Change |
| --- | --- |
| Heading order skipped h2 | Shared PanelTitle uses h2 with the same visual styles |
| robots.txt returned HTML with17 syntax errors | A real public/robots.txt, text/plain, excludes API crawling |
| Third-party depor_refresh cookie and DevTools Cookie issue | Browser /api on the web origin, external rewrite to existing backend, no public API caching; Origin checks remain |
| Own avatar512px at30CSSpx (45devicepx in this audit) | Private JPEG thumbnail96px in the existing own-photo request;192px in Settings; explicit layout dimensions |
| Private image cache TTL15min flagged | Keep private access; header no longer downloads a large signed original. Team signed URLs still expire15min; never make them public or year-cache to game audit |
| Minify JavaScript,6KiB | Source was a chrome-extension contentscript, outside app control; rerun with extensions off |
| Unused main JS,29KiB | Framework/runtime coverage estimate; preserve route/chart splitting and86KiB budget; do not claim all framework code can be deleted |
| Render-blocking CSS,13KiB | No estimated LCP/FCP savings in the supplied report; keep stable styling rather than introduce a flash of unstyled content |

The quality gate now records Accessibility/Best Practices/SEO alongside Performance and requires valid heading order/robots plus Accessibility100/SEO100 in fixture runs. Functional tests include a production-build first-party proxy with HttpOnly cookie login/reload/logout, forwarded Origin/Bearer and no cookie on unrelated API paths. Backend tests cover bounds, ownership, error handling and read-only resizing. These tests are not a real hosted Auth login.

After deployment, verify /api/health, anonymous auth refresh Origin enforcement, Cache-Control/Set-Cookie scope, robots content-type, SPA deep links and shipped bundle markers. Audit the logged-in dashboard in a clean browser after logging in again. Synthetic CI and a clean logged-out audit cannot be presented as a before/after score of the user's authenticated dashboard. No paid image transform, schema migration or photo/account reset is part of this change.

## Local verification

Three-run fixture medians: dashboard Performance99/Accessibility100/Best Practices100/SEO100; tasks98/100/100/100; login100/100/96/100 (expected anonymous refresh401 remains). Data-ready medians dashboard2328ms, programs2158ms, tasks2178ms; initial JS gzip85504bytes. Best Practices gate requires at least95; heading/robots/Accessibility/SEO are required to pass. Results are recorded in lighthouse-results.json with synthetic metadata only. Java21 verify107; browser50 flows plus corrected proxy test rerun1, all pass. CI runs all51. These results are not an authenticated hosted before/after comparison.
