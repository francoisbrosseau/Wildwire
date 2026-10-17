# The Founder's Desk — operation and review

## Current gate

The founder explicitly approved the presentation and sample on October 17, 2026
at 11:47:16 a.m. America/Toronto (15:47:16 UTC). Recurring publication is enabled:
config/founders-desk.json records enabled true, approvalStatus approved and that
approval timestamp. This does not change the six pillars, three Daily Reads,
fifteen magazine images or existing publishing schedule.

The owner-only real API preview passed on run 39046073527: one repetitive
candidate was rejected and its replacement passed, with four text requests and
a 187-word accepted note. No public content changed during that preview.
https://github.com/francoisbrosseau/Wildwire/actions/runs/39046073527
The sample and archive deployed successfully and returned LIVE_NOTE_VERIFIED on
October 17 at 15:43:06 UTC. Existing magazine, account, comment and editorial
tests plus notes integration and failure/recovery tests passed.

The first new unattended note is targeted for October 18. The October 17 sample
is already published; activation must not overwrite it or produce a second note
for the same date. A local enabled-gate run confirmed ALREADY_PUBLISHED with zero
API requests. A future unattended generation/commit/deployment is not yet
observed; verify its actual outcome rather than treating activation as proof.

Disable independently by setting enabled false. An emergency repository variable
`WILDWIRE_FOUNDERS_PAUSED=yes` also prevents API calls and commits. Disabling the
component leaves the last note, its real date and permanent archive available.
The homepage never relabels an old note as today's.

## Data and pages

- Immutable note data: content/founders-notes/YYYY-MM-DD.json.
- Stable individual URL: founder-note-YYYY-MM-DD.html.
- Archive: founders-desk.html, with optional theme filtering.
- Public catalog: js/founders-notes.js. Existing magazine search also finds notes.
- Editorial instructions: FOUNDER-DESK-EDITORIAL.md; public worldview only.
- Build: node scripts/founders-desk-core.cjs.
- Checks: npm test; node scripts/check-content.cjs.

The October 17 sample is AI-assisted editorial copy for visual/voice review,
not a claim that the founder wrote or individually approved it. At the founder’s explicit October 17 request, reader-facing generation
notices are removed. Notes and the archive retain neutral editorial attribution. The byline is WILDWIRE Editorial — The Founder's Desk. No private founder
biography enters generation. Samples remain explicitly labeled in the archive.

## Isolation and retries

The existing daily workflow's founders job starts only AFTER the magazine's
publish, deploy and verify jobs succeed. It has its own runner, approval gate,
usage report, cache, validation, commit, deployment and public verification.
Failure cannot prevent or roll back the already published main magazine.
The existing four daily starts also supply independently recoverable note
attempts; there is no additional scheduler. A completed date is a no-op.
A cached candidate must have a valid date, immutable fingerprint, full editorial
review and non-preview status before recovery can bypass fresh API generation.

Generation has at most two editorial candidates. Each candidate receives a
structured draft and a separate structured editorial review. A request has at
most one transport/output retry; auth/quota failures stop immediately. The
component has a three-minute generation budget and an eight-minute runner
limit. Rejected or partially written work is never committed. All writes occur
in the note runner checkout; tests must pass before its narrowly scoped commit.
A non-fast-forward push fails rather than overwriting concurrent work.

The note can fail while the magazine succeeds. Inspect the founders job and
its artifact, repair the cause, and use a later daily attempt or an authorized
manual main workflow dispatch (dry_run false). The magazine generator will
recognize an already published edition instead of generating duplicate articles.
Do not publish a preview artifact or manually move an unreviewed candidate into
production. Never overwrite an existing dated note to repair a later date.

## Quality and cost

150–250 words, 3–5 paragraphs, one idea, fixed attribution/disclosure. Mechanical
checks reject first-person founder impersonation, named founder biography,
forbidden slogans, markup/list padding, duplicate dates, near-matching titles,
reused text/angles and identical endings. The independent editor also judges
fabricated experiences, factual/professional claims, tone, clarity and variety
against the recent archive. These checks reduce risk; they do not establish a
mathematical guarantee of semantic originality or perfect AI judgment.

Themes rotate away from the last two notes. The recent 14 ideas/openings/endings
inform both generation and review. Deterministic originality checks compare
against the full archive. No sources, image calls or paid third-party services
are added. Typical generation uses two short text calls, with bounded retries.
The magazine consumes its API allowance first. Missing quota stops the note only.

Reports log response token usage/model, candidate rejections, timestamps and
recovery status. Estimated USD is null unless current input/output prices are
explicitly configured through WILDWIRE_FOUNDERS_INPUT_USD_PER_MILLION and
WILDWIRE_FOUNDERS_OUTPUT_USD_PER_MILLION. No guessed prices, verified balance or
hard budget guarantee are claimed. No spending limit is changed.

Artifacts persist for 14 days. Public note JSON retains generation time and
provenance; Actions logs record FOUNDER_NOTE_COMMITTED and LIVE_NOTE_VERIFIED
with actual commit/public-verification timestamps. HTTP verification checks the
current date and visible disclosure on individual and archive pages.

## Preview evidence

The owner-only same-repository PR preview calls the actual API for an isolated
future date, performs both editorial stages and saves its candidate/usage.
It never writes public notes, commits or deploys. Fork/untrusted PRs cannot use
this secret-bearing preview. The regular CI suite uses deterministic fake API
responses to exercise failures, duplicate prevention, cache recovery and gates.

Responsive CSS uses a two-column desktop card and a single-column layout below
760 px, inherited magazine gutters and readable wrapping. DOM tests cover
links, static metadata, schema attribution, disclosures, filters, search and
retention of existing magazine cards. Native browser/viewport tooling is not
available in this managed session, so no screenshot/browser QA is claimed.
The founder reviews the deployed sample before the separate activation gate.

## Public label preference — October 17

The founder explicitly requested removal of public AI-assistance/generation
notices across the website. This supersedes the earlier public-disclosure copy
requirement. The homepage notice, note/archive disclosure panels and article
image-credit annotations are removed from rendered pages. Note text, headlines,
images, URLs, schedules and activation are unchanged. WILDWIRE Editorial remains
the byline; nothing asserts personal founder or human-only authorship. Internal
image provenance, generation records and biography/accuracy checks are retained.
