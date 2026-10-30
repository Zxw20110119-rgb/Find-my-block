# Find My Block

Burnside campus navigation with manual starting pins, classroom search, local .ics timetables and school notice pins. Google sign-in and cloud timetable syncing have been removed; the account endpoints return HTTP 410. Existing cloud records have not been deleted. Timetables imported on this browser remain in local storage.

## School notices

The app reads public notices from https://burnside.school.kiwi/notices/date/YYYY-MM-DD through `/api/notices`. The default window covers 31 days in Pacific/Auckland. A one-day view is also available. Server requests use bounded concurrency and a 15-minute in-memory cache. The client refreshes every 15 minutes while open; this does not require a background task.

Identical notice text is merged across publication dates. Only known buildings or explicit room codes become map pins. Room pins identify their block approximately. Sign-up points are labelled separately. Off-campus and unrecognised locations stay in the list, without a guessed marker. The original full notice and school source link remain available.

Starts, ends and sign-up deadlines are extracted from explicit written dates. Missing dates are shown as Not stated. Notice publication dates are displayed separately and are never substituted for an activity end date. Check the school text for times, recurrence and eligibility.

`public/notices-snapshot.json` contains a dated, publicly sourced fallback. If live requests fail, the UI labels cached data and unavailable dates. Future dates without notices are not treated as a complete school events calendar; the school may publish additional notices later.

## GitHub Pages

Run `node scripts/export-pages.mjs <output-directory>` to export the static frontend. Resource paths work under `/Find-my-block/`. GitHub Pages uses the main Site's public notices API, with CORS limited to `https://zxw20110119-rgb.github.io`. No login is required and no timetable is transmitted. Preserve the Google Search Console verification HTML file in the repository root.

## Validation

`node --test tests/notices.test.mjs tests/pages-export.cjs`

`node tests/interface.cjs`

`node tests/navigation.cjs`

`node node_modules/typescript/bin/tsc --noEmit`
