# WILDWIRE maintenance

Before preparing an edition, read EDITORIAL-CONTRACT.md and PUBLISHING-SETUP.md.
The October 16, 2026 site format and existing images are approved. Daily work
updates content and associated editorial images; it is not a redesign.

Keep the logo, header, approved typography, palette, navigation, account system,
search and saved-story behavior. Never overwrite an archived article or its URL.
Every edition needs five pillar features, three fresh Daily Reads, and thirteen
unique generated images, including separate images for the five pillar tiles.

Use a separate branch/worktree for maintenance. Do not stage unrelated changes.
Run npm test and node scripts/check-content.cjs before merging. Live publishing
must use a complete validated edition and explicit GitHub Pages deployment.
Do not describe a preview or a prepared schedule as operational automation.
