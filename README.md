# WILDWIRE — Discover. Inspire. Evolve.

A responsive, static digital lifestyle publication designed for GitHub Pages.

## Launch
Upload **the contents** of this folder to the root of the `wildwire` repository (not the enclosing folder). GitHub Pages should be set to `main` and `/ (root)`.

## Functional now
- Home page with featured story, editor picks and latest stories.
- Five working category pages and article search.
- Seven original introductory articles (short-form starter content; expand and fact-check before treating as a mature editorial launch).
- Share button and browser-local favorites.
- Responsive layout.

## Comments (requires setup)
Comments are **not active** until configured. Enable GitHub Discussions in repository Settings, install the giscus GitHub App, choose a Discussions category, then copy `repo`, `repoId`, `category` and `categoryId` from https://giscus.app/ into `js/comments-config.js`. This requires readers to have GitHub accounts. Test a comment after deployment.

## AI publishing (not active)
No API keys or automated generation are included. AI publishing requires a separate secure GitHub Actions workflow, an API account, budget limits, editorial review and testing. Never add secret keys to this repository's public files.

## Images
Starter editorial photos use remote Unsplash image URLs. Check each photo's licensing and reliability before production; replace with locally hosted licensed images for best long-term control.

## Add articles
Add an object to `js/articles.js` with a unique `id`, category, title, subtitle, date, read, image and `body` array. The existing templates and links will pick it up automatically.
