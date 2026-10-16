# WILDWIRE — Discover. Inspire. Evolve.

A responsive, static editorial publication hosted with GitHub Pages.

## Site and domain

- Primary domain: `https://wildwiremag.com`
- GitHub Pages fallback: `https://francoisbrosseau.github.io/Wildwire/`
- The `CNAME` file targets `wildwiremag.com`. See [DNS-SETUP.md](DNS-SETUP.md) for Namecheap records and [WILDWIRE-STATUS.md](WILDWIRE-STATUS.md) for current verification limits.

## Reader features

- Reading remains free without an account.
- Guest favorites stay in the current browser.
- Supabase email accounts and saved-article sync are implemented in the launch branch. The database uses owner-scoped Row Level Security. See [ACCOUNT-SETUP.md](ACCOUNT-SETUP.md).
- Real signup, recovery and cross-device tests still need to be completed after deployment.

## Editorial content

The archive keeps stable-ID articles across STRENGTH, STYLE, EXPLORE, CULTURE and LIVING. Articles are stored in `content/articles/` and validated before the site catalog is built. Article IDs are permanent; add new IDs instead of replacing existing records. The October 16, 2026 manual edition adds five new features, one per pillar, while preserving the existing archive.

Reader comments use the existing Supabase sign-in. See Reader comments below for posting, moderation and verification.

## Daily publication

The approved edition has five pillar features, three Daily Reads and thirteen distinct images. Daily publication is enabled after a complete preview and live deployment passed. The first scheduled new edition is October 17, 2026; check its actual outcome rather than assuming success. See [EDITORIAL-CONTRACT.md](EDITORIAL-CONTRACT.md) for the permanent daily template and [PUBLISHING-SETUP.md](PUBLISHING-SETUP.md) for verified state, diagnostics, costs and pause/resume controls.

## Local checks

Install dependencies with `npm install`, then run:

```sh
npm test
node scripts/check-content.cjs
```

These checks cover site DOM behavior, mocked account/favorites behavior and article integrity. They do not replace live authentication, viewport or deployment checks.

## Reader comments

Article conversations use the existing Supabase WILDWIRE accounts, not GitHub
Discussions. Guests can read published comments; registered readers choose a
public display name and can post or remove their own comments. Email addresses
are never copied into public display names. Comments follow permanent article
IDs, so they remain attached when a story moves into the archive. New daily
articles need no per-story configuration.

The reader_comments migration enables RLS, public reading of published rows,
owner-scoped posting/removal, and no client update/moderation permission. A
SECURITY INVOKER trigger serializes each reader's submissions and enforces a
30-second cooldown, 20 comments per rolling 24 hours, body/name limits and a
same-story duplicate guard. The frontend renders all reader text with
textContent, preserves drafts on errors, and never uses a service-role key.

Moderation: in the WILDWIRE Supabase project, open Table Editor →
article_comments and set a comment's status to hidden. Only the project owner
can moderate; the public site requests published comments only. Hide abuse
rather than deleting a reader account. The signed-in reader can remove their
own comment using the article page. These are basic spam controls, not a
guarantee against coordinated abuse.

Verification: npm test includes comment UI/session/ownership/XSS/error checks.
The transaction in tests/comments-rls.sql exercises actual database roles and
rolls back all fixture users/comments; run only against the intended project.
The live REST endpoint must allow public reads and reject guest writes.
