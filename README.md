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

Comments are not active until GitHub Discussions and giscus are configured in `js/comments-config.js`.

## Daily publication

The approved edition has five pillar features, three Daily Reads and thirteen distinct images. The API key works, but unattended publishing remains off until a complete preview and live deployment pass. See [EDITORIAL-CONTRACT.md](EDITORIAL-CONTRACT.md) for the permanent daily template and [PUBLISHING-SETUP.md](PUBLISHING-SETUP.md) for verified state, diagnostics, costs and pause/resume controls.

## Local checks

Install dependencies with `npm install`, then run:

```sh
npm test
node scripts/check-content.cjs
```

These checks cover site DOM behavior, mocked account/favorites behavior and article integrity. They do not replace live authentication, viewport or deployment checks.
