# WILDWIRE — Discover. Inspire. Evolve.

A responsive, static digital lifestyle publication designed for GitHub Pages.

## Launch
Upload **the contents** of this folder to the root of the `wildwire` repository (not the enclosing folder). GitHub Pages should be set to `main` and `/ (root)`.

## Functional now
- Home page with featured story, editor picks and latest stories.
- Five working category pages and article search.
- Seven short-form starter articles plus one researched, long-form Explore pilot with linked sources. The pilot is a content and reader-flow test; scheduled AI publishing is not active.
- Share button and browser-local favorites.
- Responsive layout.

## Comments (requires setup)
Comments are **not active** until configured. Enable GitHub Discussions in repository Settings, install the giscus GitHub App, choose a Discussions category, then copy `repo`, `repoId`, `category` and `categoryId` from https://giscus.app/ into `js/comments-config.js`. This requires readers to have GitHub accounts. Test a comment after deployment.

## AI publishing (not active)
No API keys or automated generation are included. AI publishing requires a separate secure GitHub Actions workflow, an API account, budget limits, editorial review and testing. Never add secret keys to this repository's public files.

## Images
Editorial images are served locally from `images/` as WebP files. See `IMAGE-SOURCES.md` for provenance. See `REVIEW.md` for the upgrade details, tested behavior and remaining verification limits.

## Add articles
Add an object to `js/articles.js` with a unique `id`, category, title, subtitle, date, read, image and `body` array. The existing templates and links will pick it up automatically.
