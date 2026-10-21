# Find My Block

Burnside campus navigation with local calendar import, automatic class-to-class routes and account-backed timetable storage.

## GitHub Pages account connection

The GitHub Pages frontend at `https://zxw20110119-rgb.github.io/Find-my-block/` uses the same account database as the hosted main site. **Sign in with Google** opens `/account/connect` on the main site. The window verifies Google sign-in using the existing HttpOnly cookie flow and sends a short-lived connection token to the exact trusted Pages origin. The receiver checks origin, popup identity and a random state before accepting it, then verifies the account with the API.

Pages API requests use an origin-bound bearer token with `credentials: omit`; they do not rely on third-party cookies. The token expires after one hour and is kept only in tab-scoped `sessionStorage`. Reopening a tab or an expired connection can require reconnecting; users do not need to reimport their cloud timetable. Signed-out guest timetables and account-specific unsaved backups remain separate. Signing out disconnects that Pages tab, not other browser sessions on the main site.

The backend only allows CORS from the exact Pages origin. Cookie sessions and Pages tokens have different issuers/audiences and cannot substitute for one another. Timetable owner IDs are derived from the verified session, never a client-selected account. The original revision checks and Google validation remain active. No Google client secret is used or exported.

Generate Pages assets at a chosen output directory using `node scripts/export-pages.mjs /absolute/output/path`, or omit the path to refresh generated files at a GitHub checkout's root. Keep **Settings → Pages → main → /(root)**. GitHub and Sites source changes do not automatically sync with each other.

## Google sign-in setup

The site is ready for Google Identity Services, but Google login remains disabled until `GOOGLE_CLIENT_ID` is configured in the Sites runtime environment.

1. In Google Cloud Console, create an OAuth client of type **Web application**.
2. Add this **Authorized JavaScript origin**: `https://find-my-block-bhs.zengxuanwen.chatgpt.site`.
3. Configure the app name and support details using the project owner’s real contact information. The privacy page is `/privacy.html`.
4. Store the resulting public client ID in the Sites environment as `GOOGLE_CLIENT_ID`. No Google client secret is used by this ID-token flow.
5. Redeploy the saved Site version to apply environment changes.

Google setup documentation: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

`SESSION_SECRET` is a server-only secret configured in Sites. Do not put it in source, browser JavaScript or the hosting manifest. Changing it signs everyone out.

## Storage and identity

The logical D1 binding is `DB`. Each timetable row is keyed by the verified Google subject identifier; client requests cannot select an owner. Google ID tokens are verified against Google’s public keys, expected audience, issuer, expiry and nonce. Signed, HttpOnly, Secure cookies keep sessions active for up to 30 days.

The API stores parsed calendar events and room mappings, not access to a Google Calendar account. Import a new .ics file when the underlying calendar changes. Guests can continue using device-only storage. Signed-in imports save automatically. Existing guest data is uploaded only after selecting **Save this timetable**.

The client keeps pending changes per account to survive a network interruption. Revision checks prevent silently overwriting edits from another device. **Remove timetable** writes an empty timetable to the account.

## Files

- `site/index.html`: campus HTML, served by the root route.
- `public/`: browser scripts, styles and campus map.
- `server/account.mjs`: Google login, sessions and timetable API.
- `db/schema.ts`, `drizzle/`: D1 schema and migrations.
- `app/api/[...path]/route.ts`: framework API adapter.

## Checks

```sh
node tests/navigation.cjs
node tests/interface.cjs
node tests/account-client.cjs
node --test tests/accounts.test.mjs
node --test tests/pages-transport.cjs
node --test tests/account-connect.cjs tests/pages-export.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Use the Sites build and publication workflow. The maintained Vinext starter supplies development and production build scripts. Production migrations are applied by Sites when publishing.
