# WILDWIRE editorial homepage upgrade

Based on the existing main branch, commit 2ca4f1f1090b528fba8bd02fd8b27cfb007154a5. The supplied WILDWIRE-v2-upgrade.zip was accessible; its application script matches the repository version.

## Changes

- Preserved the centered masthead, champagne-gold accent, DISCOVER. INSPIRE. EVOLVE. tagline, and Strength, Style, Explore, Culture and Living categories.
- Rebuilt the homepage with a cinematic cover, ivory lead feature and supporting stories, five-part category index, reading list, and publication statement.
- Added a visible search entry in the shared header; retained the archive search, article routes and original favorites storage key.
- Created a dedicated cinematic sea-overlook cover illustration, integrated into the homepage and travel story.
- Replaced the running-shoes image with walkers in a mountain landscape and shopping-bag imagery with a tactile knit still life. Store all site images locally in WebP format with a smaller cover option for mobile.
- Retained all seven articles and added descriptive image alternatives, keyboard focus treatments, a skip link, and reduced-motion support.
- Hardened favorites against malformed local storage, including valid JSON with an unexpected type.

## Verification

179 automated DOM integration assertions passed using JSDOM on Node 24: homepage story rendering; five category filters; search matches, case handling and no-results state; all seven articles; save/remove favorites from cards and articles; saved favorites across page loads; invalid saved data; invalid article/category routes; and local link/asset existence. Every local image also decoded successfully. JavaScript syntax and git whitespace checks passed.

These are DOM checks, not desktop/mobile browser tests. Responsive CSS includes 1000px, 760px and 480px breakpoints, but layout, image cropping, touch behavior and viewport overflow have NOT been visually verified. The supported preview browser was unavailable. Share behavior and external comments were not tested. Comments remain unconfigured, as in the original site.

## Publication

The public repository and current live homepage were inspected. A GitHub push dry run failed because this environment has no GitHub credentials. No remote branch was updated and no deployment occurred. The existing live website therefore remains unchanged. The local commit and complete site package are ready for a connected GitHub session. After publishing, test desktop/mobile and verify the live revision before calling this release complete.

## Reproduce the DOM checks

With Node 24 or newer, run `npm install` followed by `npm test`. Dependencies are for tests only; GitHub Pages continues serving static HTML, CSS, JavaScript and images without a build step.

## Creative brief revision

The October 15 creative brief is preserved in `CREATIVE-DIRECTION.md` and is the source of truth. Revisions replace the ordinary kitchen with an inclusive shared-table scene, restore the cinematic sea-overlook direction, lead with human connection, and vary the homepage pacing with an asymmetrical feature and a compact reading list. The original short introductory articles remain unchanged; no new research or daily publishing system is represented as complete. No domain, hosting or paid-service settings were changed. This version is for design review before deployment.
