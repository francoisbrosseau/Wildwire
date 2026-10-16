# WILDWIRE Status — 2026-10-16

## Current launch state

The approved visual identity and seven-article pilot are deployed from `main`. GitHub Pages deployment for commit `36e495a7fe5f8d9b206b74911533424881933b21` succeeded. Live browser checks confirmed `https://wildwiremag.com/` loads over HTTPS, `https://www.wildwiremag.com/` redirects to the apex, and the previous GitHub Pages URL redirects to the apex.

## Reader accounts

- Supabase project `WILDWIRE` is active and healthy.
- `public.saved_articles` exists with Row Level Security enabled and owner-scoped SELECT, INSERT and DELETE policies.
- The project had zero reader accounts and zero saved rows at the last check.
- The live account page loaded with sign-in/create-account controls and the recovery route. The owner reports the Supabase Site URL and redirect allowlist are set.
- No real signup, email confirmation, password recovery email or cross-device sync test has been performed; those require an owner-controlled email address and a second browser/device.
- Browser client uses only the public project URL and publishable key. No service-role or secret key is included.
- Guest favorites remain browser-local. Account favorites import them on first sign-in.

## Content and publishing

- Seven stable-ID pilot articles cover all five editorial pillars. Content checks validate unique IDs, distinct images and no near-matching titles.
- The daily publishing workflow is **not included in this deployment and is not active**. No AI key or recurring charge is configured.
- No test article has been published. Unattended publication requires separate explicit approval after a successful dry run and editorial review.

## Verification

- `npm test`: 228 DOM integration checks and mocked account/session, favorite-merge and RLS checks passed locally.
- `node scripts/check-content.cjs`: all seven articles passed content integrity checks.
- Live browser smoke checks confirmed the homepage, `www` and GitHub Pages redirects, account and recovery screens, Strength archive, permanent article URL, story search, and guest favorite add/remove.
- Live Supabase schema, grants, RLS policies, zero initial users and security advisor status were checked. Advisors returned no security findings.
- No mobile viewport test or real account/cross-device test was completed in this session.

## Remaining work

- Complete real signup, email confirmation, login, password recovery, guest-favorite import and second-browser sync using an owner-controlled email/account.
- Confirm mobile appearance on a real narrow viewport.
- Keep daily AI publishing disabled until separately approved and safely tested. The scheduled workflow was deliberately excluded from this deployment.
- The logo slash still has a pale edge and needs a cleaner edit that preserves the approved letterforms; no experimental replacement was deployed.
