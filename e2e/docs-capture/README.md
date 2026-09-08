# docs-capture

Playwright specs that take annotated screenshots for the Notifications section of the shared-docs
user guide (`shared-docs/docs/user-guide/notifications/`). These are not a regression suite —
where a spec opens a form (the channel picker), it screenshots and cancels without submitting, so
nothing fails CI and no real data changes.

Scoped to the **tenant-facing** app only. Notifications-ui also has a handful of platform-owner-only
screens (Monitoring, Templates, Platform Providers, under `isPlatformOwner` in `sidebar.tsx`) —
those are internal operational tooling, not something a tenant admin ever sees, so they're
deliberately out of scope for this suite and for the user guide it feeds.

Unlike inventory-ui's PIN-login docs-capture suite, this app has no PIN flow — `lib/auth.ts`'s
`ssoLogin` drives a real SSO form submission with the platform's demo account, the same flow
already proven in `e2e/sso-login-and-landing.spec.ts`.

Login itself happens **once per run**, not once per spec. `auth.setup.ts` runs first (it's its own
Playwright project, `docs-capture-setup`, that the `docs-capture` project depends on), signs in
via `ssoLogin`, and saves the session to `.auth/demo-tenant.json`; every spec in this folder then
reuses that saved session via `storageState`. Driving the full SSO redirect round trip separately
for every spec, against the live SSO host, proved unreliable in practice (the redirect back to
this app's own domain didn't always complete) — logging in once avoids repeating it.

## Re-running this

The guide's screenshots go stale whenever the WhatsApp Inbox, WhatsApp Subscription, or
Notification Preferences pages change layout. Re-run the relevant spec and re-publish shared-docs.
Always target the `docs-capture` project so setup runs first:

```
pnpm docs:capture
# or a single file:
npx playwright test --project=docs-capture-setup --project=docs-capture e2e/docs-capture/whatsapp-inbox.spec.ts --headed
```

`E2E_LOGIN_EMAIL`/`E2E_LOGIN_PASSWORD` default to the platform's demo account
(`admin@demo.codevertexafrica.com`). Screenshots reflect whichever tenant that account belongs to;
to capture a different tenant, drive the header's tenant switcher with a real click (platform-owner
accounts only) rather than trying to inject tenant-filter state — it's deliberately not persisted
to localStorage (see `src/store/tenant-filter.ts`), so it can't be seeded the way the session
itself could.

Screenshots are written straight into the sibling `shared-docs` repo
(`docs/user-guide/notifications/assets/`) — there's no copy step, so both repos need to be checked
out side by side (already the case for this monorepo-of-repos layout).
