# WILDWIRE Roadmap

## Current milestone — domain and reader accounts

- [x] Preserve the approved homepage direction, identity, article library and five pillars.
- [x] Store articles by permanent ID in JSON and build the browser catalog from that source.
- [x] Keep browsing and browser-local guest favorites available.
- [x] Prepare Supabase account UI, client-side wiring and row-level-security migration.
- [x] Prepare a guarded daily publishing workflow, quality checks, schedule in `America/Toronto`, duplicate checks and an image license allowlist.
- [x] Document Namecheap DNS records and steps; confirm no Namecheap DNS connector is available.
- [x] Connect Supabase project `WILDWIRE`; configure public client URL and publishable key locally.
- [x] Apply saved-articles migration and verify owner-scoped RLS policies and privileges.
- [x] Owner reports GitHub Pages DNS check success.
- [ ] Configure/verify Supabase Site URL and allowed redirects; test registration, login, recovery, cross-device sync and removal. Google OAuth is optional.
- [ ] Verify `wildwiremag.com` HTTPS, www redirect, Pages source, and live site.
- [ ] Deploy approved site and account configuration only after DNS and Supabase setup are verified.

## Next milestone — daily publication

- [ ] Set up OpenAI API and GitHub Actions secrets; run a real generation/fact-check/attribution dry run.
- [ ] Founder reviews sample pipeline output and monthly usage cap.
- [ ] Founder approves enabling unattended publication; then run a scheduled end-to-end publication and live-site verification.

## Later

- Add richer editorial analytics and an editorial review queue if publishing volume warrants it.
- Connect GitHub Discussions/giscus for comments.

Do not increase publishing volume until the first daily system has demonstrated quality, reliability and acceptable cost.
