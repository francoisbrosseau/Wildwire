# WILDWIRE Status — 2026-10-16

## Current launch state

The approved visual identity and seven-article pilot are prepared on the `launch/operation-wildwire` branch. The owner reports that GitHub Pages' DNS check succeeded and that Supabase auth redirects have been configured. This branch has not yet been merged to `main`; the public site and custom domain must be checked after deployment.

## Reader accounts

- Supabase project `WILDWIRE` is active and healthy.
- `public.saved_articles` exists with Row Level Security enabled and owner-scoped SELECT, INSERT and DELETE policies.
- The project had zero reader accounts and zero saved rows at the last check. No real signup, email confirmation, password recovery or cross-device sync test has been performed.
- Browser client uses only the public project URL and publishable key. No service-role or secret key is included.
- Guest favorites remain browser-local. Account favorites import them on first sign-in.

## Content and publishing

- Seven stable-ID pilot articles cover all five editorial pillars. Content checks validate unique IDs, distinct images and no near-matching titles.
- The daily publishing workflow is **not included in this launch branch and is not active**. The local draft workflow was withheld because it would enable scheduled jobs that can use a secret and push public articles. No AI key or recurring charge is configured.
- No test article has been published. Unattended publication requires a separate explicit approval after a successful dry run and editorial review.

## Verification

- `npm test`: 228 DOM integration checks and mocked account/session, favorite-merge and RLS checks passed locally.
- `node scripts/check-content.cjs`: all seven articles passed content integrity checks.
- Live Supabase schema, grants, RLS policies, zero initial users and security advisor status were checked. Advisors returned no security findings.
- These checks do not prove real authentication, desktop/mobile browser rendering, live DNS/HTTPS, or cross-device sync.

## Remaining launch checks

- Merge the approved launch branch to `main` and wait for GitHub Pages deployment.
- Verify the deployed site at `wildwiremag.com`, `www` redirect, certificate, images and article links.
- Complete real signup, confirmation, login, password recovery, save/remove, guest-favorite import and a second-browser sync test.
- Keep daily AI publishing disabled until separately approved and safely tested.
