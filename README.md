# Find My Block

Burnside campus navigation with local calendar import, automatic class-to-class routes and account-backed timetable storage.

## GitHub version

Synced from the published **Find My Block, version 24** source commit `aa936af4b4421791f0935b0c19bea023817b8ce6` on 22 October 2026.

- Full hosted app: https://find-my-block-bhs.zengxuanwen.chatgpt.site
- GitHub Pages: https://zxw20110119-rgb.github.io/Find-my-block/

The root `index.html`, browser scripts, `assets/`, and `privacy.html` are generated for GitHub Pages. All navigation, manual starting points, building search, calendar import, automatic class-to-class routes, local road closures and simple map mode work without a server. GPS remains removed.

GitHub Pages stores the timetable in the same browser between visits. It cannot run the Google account and D1 API; use **Open main site** for account features once Google sign-in has been configured. Private session secrets and user timetable records are not included in this repository.

To publish the static version, choose **Settings → Pages → Deploy from a branch → main → /(root)**. To refresh these files after editing `site/index.html` or `public/`, run:

```sh
node scripts/export-pages.mjs
node --test tests/pages.cjs
```

The original full-stack source remains in `app/`, `server/`, `db/`, `drizzle/`, `site/` and `public/`. The root `account.js` is the device-only Pages adapter; `public/account.js` is the full hosted account client. Future GitHub changes do not automatically update the ChatGPT Site, and Site changes do not automatically update GitHub.

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
node node_modules/typescript/bin/tsc --noEmit
```

Use the Sites build and publication workflow. The maintained Vinext starter supplies development and production build scripts. Production migrations are applied by Sites when publishing.
