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

Seven stable-ID articles span STRENGTH, STYLE, EXPLORE, CULTURE and LIVING. Articles are stored in `content/articles/` and validated before the site catalog is built. Article IDs are permanent; add new IDs instead of replacing existing records.

Comments are not active until GitHub Discussions and giscus are configured in `js/comments-config.js`.

## Daily publication

A five-pillar editorial engine and sample edition are prepared, but unattended publishing is not active. It requires a separately billed API key, an account spending limit, an approved sample and a live end-to-end publication test. See [PUBLISHING-SETUP.md](PUBLISHING-SETUP.md).

## Local checks

Install dependencies with `npm install`, then run:

```sh
npm test
node scripts/check-content.cjs
```

These checks cover site DOM behavior, mocked account/favorites behavior and article integrity. They do not replace live authentication, viewport or deployment checks.
