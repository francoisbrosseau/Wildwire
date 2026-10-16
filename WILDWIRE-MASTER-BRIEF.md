# WILDWIRE Master Brief

WILDWIRE is an independent, premium digital lifestyle and culture publication for curious, ambitious people. Its approved identity is confident, warm, intelligent, strong, cinematic and inclusive. Preserve the centered ivory-and-champagne wordmark with its lightning cut, `DISCOVER. INSPIRE. EVOLVE.`, charcoal and warm-paper palette, restrained burnt orange, and the five pillars: STRENGTH, STYLE, EXPLORE, CULTURE and LIVING. Do not replace the approved visual identity without the founder's approval.

Coverage ranges across training, nutrition, personal style, travel, books, art, technology, relationships, family, food, psychology, spirituality, habits, money and everyday life. Articles must be useful, substantial, researched when factual claims require it, engaging and human. Avoid generic AI filler, manufactured quotes, shallow advice and repetitive topics. Reading remains free without an account; guest favorites continue to work.

## Publishing requirement

The long-term target is one quality-led daily edition at **7:00 a.m. America/Toronto**, with daylight-saving handling. The intended system selects varied topics across all five pillars, researches credible sources, drafts original articles, verifies claims and source links, rejects weak or duplicate work, checks image licensing, updates the static article catalog, runs tests, logs outcomes, and leaves the current website untouched if a run fails.

Automation is **not active** until the founder authorizes unattended publishing, the API and image-rights path are configured, and a scheduled end-to-end deployment has passed. API-free ChatGPT scheduled tasks do not provide a dependable unattended pipeline for research, repository writes, deployment and live verification; the prepared path is GitHub Actions plus a separately billed AI API. Never activate paid services or unattended publishing without approval.

## Technical foundation

- GitHub Pages static site, project path `/Wildwire/` today.
- Permanent article IDs and JSON source records live in `content/articles/`; `scripts/build-content.cjs` generates `js/articles.js`.
- Existing local favorites key: `wildwire-favorites-v1`.
- Optional cross-device favorites use Supabase Auth and `saved_articles` with row-level security. The Supabase connector is available, but currently returns no projects; connect the project-owning account or create a project before configuration. Only the browser-safe project URL and publishable/anon key belong in frontend config. Never expose a service-role key.
- Custom domain target: `wildwiremag.com`, purchased through Namecheap. Registrar DNS controls are not available through this workspace; the required records and exact steps are in `DNS-SETUP.md`. GitHub Pages settings and live verification are still pending.

See `WILDWIRE-ROADMAP.md`, `WILDWIRE-STATUS.md`, `ACCOUNT-SETUP.md`, `DNS-SETUP.md`, and `PUBLISHING-SETUP.md` for current implementation and next steps.
