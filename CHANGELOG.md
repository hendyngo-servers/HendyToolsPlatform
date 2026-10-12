# Hendy Tools Platform Changelog

## 2026-10-12 — Premium Release Console update

- Added premium navy/blue Release Console at `/admin.html`.
- Added release history API at `/api/v1/releases/history`.
- Archived immutable manifest snapshots in R2 for version/changelog history.
- Updated the Worker config name to `hendytoolsplatform` to match the live Cloudflare service.
- Set Windows and Flutter updater source defaults to the current Worker URL.
- Kept publishing credentials in GitHub Actions Secrets; the website does not contain Cloudflare API tokens or an unauthenticated upload endpoint.
- Updated manual deploy workflow to avoid racing the Cloudflare Workers Builds integration on every push.

## 3.1.1 — Auto updater foundation

- Windows app checks release metadata and offers installer download after user confirmation.
- Flutter Android app checks release metadata and opens the direct APK download/install flow with user confirmation.
- GitHub Actions can build Windows installer and Android APK in cloud runners.
