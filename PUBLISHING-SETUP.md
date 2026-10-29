# WILDWIRE publication operations

## Verified state — October 16, 2026

- Complete preview **#22 passed** on commit
  `5ba4506d912b3aa0a1300436c38bad9d2ded1db4`:
  https://github.com/francoisbrosseau/Wildwire/actions/runs/38951208443
  It staged eight new articles (five pillars, three Daily Reads) and thirteen
  unique images, rebuilt the homepage/archive catalogs, and passed all site,
  account/favorites mocks, content, source-binding and API regression checks.
  The packaged preview contains 29 archived articles, preserving the prior 21.
- This was a **recovered full preview**, not a clean one-shot run: three validated
  stories/images were recovered from earlier diagnostic runs; five stories and
  ten images were newly generated in #22. A Living candidate was rejected and
  its one bounded fresh-topic fallback succeeded. The resumed run took 16m10s.
  Do not misrepresent that as the runtime or cost of an entire fresh edition.
- Main repair: fact-checkers now supply exact evidence-grounded edits, instead
  of a wholesale rewrite that could reintroduce errors. Numbered citations are
  mapped to source-array positions, not research-note/source-ID numbering.
  Invalid or unsupported corrections still fail closed. Image byte hashes
  prevent renamed archive images or duplicate new files from bypassing checks.
- The October 16 approved manual edition now has a manifest pointing to its
  existing eight stories and five existing tile assets. No logo/image bytes or
  existing article URLs were changed by that backfill.
- The founder approved the Actions publishing-source change, deployment gate
  and daily unattended publishing on October 16. Pages Source is now **GitHub
  Actions**, `WILDWIRE_LIVE_APPROVED=yes`, `WILDWIRE_AUTO_PUBLISH=enabled`.
- Explicit Actions deployment #38960071745 succeeded:
  https://github.com/francoisbrosseau/Wildwire/actions/runs/38960071745
  A subsequent domain check returned LIVE_VERIFIED for all eight approved
  October 16 stories and thirteen images. Live production-path run #38960361323 passed all three jobs: publish,
  explicit deployment, and public verification. It correctly returned
  ALREADY_PUBLISHED and generated no duplicate October 16 content.
  https://github.com/francoisbrosseau/Wildwire/actions/runs/38960361323
- Recurring starts are enabled for 3:17 and 5:17 a.m. America/Toronto, with a
  6:40 commit cutoff. The first new scheduled edition has not yet occurred;
  its next target is October 17, ready before 7 a.m. local time. No 365-day or
  exact-time reliability guarantee follows from one successful sample.
- The owner's reported $16 payment and updated $50 monthly billing limit remain
  independently unverified. The founder reported raising the limit to $50 on
  October 16 and wants to reassess actual costs after a month. No
  payment, recharge, billing-limit increase or new paid service was activated.
- The approved template is in EDITORIAL-CONTRACT.md. Manual daily editions remain
  supported while the automated path is being tested.

## Repair prepared October 16

Drafts and revisions now use a strict output schema and source IDs. Only the
research registry can attach source URLs, preventing model revisions from
inventing or changing them. Factual checks still run; binding a known URL does
not prove its claims. Unsupported material must be corrected or rejected.

Every request has a timeout, progress and heartbeat logs, bounded transient
retries and recorded API usage. Invalid keys/quota failures stop immediately.
Validated articles and images are checkpointed outside the publication archive.
Actions restores these checkpoints for the same branch, code and edition date.
A failed story no longer discards all previously validated work.

Previews stage the NEW content in a disposable runner checkout, build its actual
catalog, and run homepage, article, search, archive and favorites tests. They
never commit or deploy. A preview's generation/validation rejection is shown as
**PREVIEW NEEDS ATTENTION** with an attached report, not as a production alert.
A green preview job alone is insufficient: read its summary and step outcomes.
Production failures still fail the workflow and report a GitHub issue.
Artifacts retain sample articles, images, provenance, usage and diagnostic reports
for 14 days; a successful preview also includes a packaged static site.

## Publish and deployment

A production candidate commits all eight articles, thirteen images, edition
manifest and both catalogs together. Published IDs/URLs are permanent. The
homepage shows the current edition while older content stays searchable and
saveable. GitHub bot commits do not trigger a branch-based Pages build, so the
pipeline explicitly calls the reusable pages.yml deployment workflow, then
verifies all eight stories and thirteen images on WildWireMag.com.

The explicit Pages job requires WILDWIRE_LIVE_APPROVED=yes. With that approved
gate enabled, ordinary main pushes and authorized production runs deploy the
validated static artifact.
The repository's **Settings → Pages → Source must be GitHub Actions** before
using pages.yml. The migration was approved and saved on October 16. Ordinary
pushes to main, manual deploys, and the daily engine now use pages.yml.
Deployments use the github-pages environment and short-lived GitHub permissions;
no personal GitHub token or new paid hosting service is needed.

Live verification failure means public state must be inspected. It does NOT
prove the old site is still live: a deployment may have completed before a
network/verification error. Generation/validation failures before a commit do
leave the published archive untouched.

## Schedule and controls

- Ready-to-read target: 7:00 a.m. America/Toronto, including daylight saving time.
- Scheduled starts: 3:17 a.m. and 5:17 a.m. Toronto time. Second run retries the
  day's candidate; completed editions are not generated again.
- Scheduled candidates must reach the commit step before 6:40 a.m. local time.
  Manual live tests can run during the day after the launch gates are set.
- WILDWIRE_AUTO_PUBLISH=enabled AND WILDWIRE_LIVE_APPROVED=yes are both required
  for recurring or manual live publication. Live dispatches must use main.
- Pause: remove/change WILDWIRE_AUTO_PUBLISH. Resume: restore enabled after
  checking the current workflow and edition state.
- A separate 6:50 a.m. Toronto watchdog checks today's complete public edition
  and raises a dated GitHub issue on a missing edition or live-check failure.
  It does not generate content or incur OpenAI API usage. It honors both gates.
- Activation requires a complete preview AND the Pages/live path to pass.

GitHub may delay scheduled runs; this is a target with retries and monitoring,
not a guarantee of exact daily availability. Official references:
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
https://docs.github.com/en/actions/concepts/security/github_token
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Cost

ChatGPT subscription usage and OpenAI API usage are separate. The GitHub
runner calls OpenAI using the existing API secret, consuming the API account's
credits/billing allowance. Creating the key itself is not an image/article
purchase. Do not request or activate a new paid service, increase the approved
budget, or claim that the owner's reported $16 payment/balance or current $50 hard cap
has been independently verified.

Measured #22 requests: 747,367 input tokens (86,682 cached; 77,392 cache writes),
63,121 output tokens, 69 web-search tool calls and ten generated images. The
root Responses usage does not expose the image model's own token breakdown.
At October 16 standard GPT-6 Luna prices, recorded text usage estimates to
$0.1004; recorded search calls to $0.69. The official image calculator estimates
$0.01029 image output per medium 1536×1024 GPT-Image-2.5 image, or about $0.103
for these ten, excluding image-model input. Thus #22's recorded requests imply
about $0.90, **excluding the three recovered stories/images**, earlier failed
attempts, some image input, tax and any unreported billable requests. This is
an engineering estimate, not an invoice or a verified account charge.

Extrapolating the five newly generated stories and their research/review work
to eight, plus thirteen images, suggests roughly **$40–$55 USD/month** at daily
frequency, before tax, with considerable retry variation. One recovered sample
cannot establish a reliable monthly average. Do not promise the full approved
format stays below $50. The founder approved a reported $50 monthly limit
and daily automation, with a review of actual costs after the first month.
If costs exceed that ceiling, discuss changes to volume or frequency before
changing the approved daily template or increasing any billing limit. Do not silently reduce the approved daily format.
Five stories/five images would likely cost less, but is NOT the approved eight-
story/thirteen-image template and needs the founder's explicit choice.

The existing public GitHub Pages repository does not require a new paid hosting
service for this implementation. Secure API billing settings must be inspected
in OpenAI Platform to confirm balance, recharge behavior and an enforced cap.
The repository cannot inspect or enforce an account-level billing limit.

Official references:
https://learn.chatgpt.com/docs/pricing
https://developers.openai.com/api/docs/pricing
https://developers.openai.com/api/docs/guides/image-generation

## Recovery

A pre-commit rejection needs no public rollback. Retry the same preview/date to
recover validated checkpoints. Inspect the attached report for the actual cause.
For a committed edition with failed deployment, rerun deployment for that commit;
do not regenerate and create duplicate stories. For content withdrawal, prefer
an archive-preserving correction of edition selection and a redeployment.
If a corrupt deployment must be reversed, revert its commit and deploy the last
known-good revision. Never rewrite Git history or delete unrelated articles.

## Manual morning workflow

Follow EDITORIAL-CONTRACT.md. Add a complete new dated edition, rebuild catalogs,
run npm test and node scripts/check-content.cjs, publish through the configured
Pages path, and verify the real domain. Report explicitly whether publication
succeeded. ChatGPT does not need to be open for GitHub Actions to run once the
complete production path is tested and enabled.

## Finance expansion — October 16, 2026

The founder requested Finance as a sixth daily pillar. The current format is now nine stories (six pillars plus three Daily Reads) and fifteen unique images (nine covers plus six separate pillar tiles). Finance is included in generation, catalog building, homepage/category navigation and public verification. Existing stories and image bytes remain preserved. The original eight-story preview and cost sample above predate this expansion; they do not measure the expanded format. No API billing limit or schedule was changed.

## October 17 morning failure and recovery

The recorded scheduled run started at 07:40 Toronto, after the ready-by target.
Strength passed; Style research exhausted max_output_tokens after its first
candidate was rejected. No edition was committed or deployed. The exact cause
of the absent early schedule events is not exposed by the available run logs.
Research now has 16,000 output tokens; truncated responses are discarded and
retried with bounded increases up to 32,000, never accepted as complete.
Incomplete API usage is included in diagnostics.
Scheduled starts now target 00:17, 02:17, 04:17 and 05:17 America/Toronto.
This supersedes the earlier two-start schedule and hard 06:40 cutoff: a late
complete validated edition is published with a warning instead of discarded.
GitHub scheduling remains best-effort. No exact-time guarantee is implied.
A date-limited push recovery trigger restores the October 17 run artifacts.
Remove this temporary trigger and marker after today's publication is verified.

The resumed run validated Strength, Style, Explore and Culture, then rejected a
Living review that used an unrecognized research source ID. Reviews now receive
three source IDs matching citation positions; original research IDs and all
verified URLs remain preserved. Unknown corrections still fail, with one bounded
fresh-topic fallback instead of terminating the entire edition immediately.

The next recovery validated all nine stories and their covers plus four category
tiles. Living's category tile was rejected because a randomly selected article
pairing requested traveling friends while the approved tile concept requested
family cooking. Category tiles now use their own approved scene/group as both
the generation and visual-review brief. Article pairing rotation is unchanged.

## October 17 recovery — verified live

Recovery run https://github.com/francoisbrosseau/Wildwire/actions/runs/39043818543
published commit bd30b0c345280068ebb4ce9cc2ca31b6655666ee and returned
LIVE_VERIFIED at 11:11 a.m. Toronto on October 17. All nine new articles and
fifteen distinct images passed the production checks, explicit Pages deployment
and public-domain verification. The archive grew from 22 to 31 articles; no
existing article JSON was modified. This used recovered validated work across
multiple repair attempts; it was not a clean unattended nine-story preview.

The temporary date-limited recovery push trigger and marker were removed.
Permanent repairs retain bounded truncation retries, sequential review IDs with
unchanged evidence URLs, consistent tile scenes, and four early scheduled starts.
Activity-bearing group identities no longer force travel into unrelated scenes.
A late complete validated edition publishes with a warning. GitHub scheduling
is still best-effort; the next unattended edition remains to be observed.

## Optional Founder’s Desk — approved October 17

A separate text-only note job follows successful magazine deployment and public
verification in the existing workflow. The magazine’s schedule and its publish,
deploy and verify jobs are unchanged. The founder approved the sample and presentation on October 17 at 11:47 a.m.
Toronto. Recurring notes are enabled in config/founders-desk.json, with the first
new unattended note targeted for October 18. The October 17 note is a
labeled AI-assisted editorial sample, not personally authored copy. See
FOUNDER-DESK-OPERATIONS.md for gates, preview evidence, bounded retries, cost
reporting, failure recovery and independent pause controls.

## October 19 publication and verification repair

The October 19 scheduled run generated and validated its complete content but its push was rejected because main advanced during generation. The edition was subsequently recovered and deployed. The current publisher fetches and rebases its validated edition before a normal non-force push; that repair was already present at inspection.

The public verifier still expected nine stories and incorrectly treated the independent Mind & Spirit feature as a pillar. It now requires six true pillars, three Daily Reads and one distinct Mind & Spirit feature, verifying all ten covers and six separate tile images. The watchdog label now describes the same ten-story/sixteen-image edition. Local site/content checks passed, and the repaired verifier returned LIVE_VERIFIED for all October 19 articles and images. Both production gates remain enabled. No editorial format, logo, archived story or existing image bytes changed.

The October 20 full future-edition preview passed in run 39352755320: ten newly researched full articles, sixteen distinct reviewed images, build and new-edition integration checks. Both generation and validation steps succeeded; production commit/deploy were skipped. The independent real Founder’s Desk API preview also passed (39352950817). These tests validate the current system, not a guarantee of future scheduler timing.


## October 21 reliability repair

The morning production attempt timed out three times during the first research request; no new edition was committed. Web-search research and fact-checks now use Responses background mode, polling the same accepted response for up to ten minutes. Retrieval interruptions do not submit duplicate research. Existing source binding, independent review, full-length articles, visual checks and ten-story/sixteen-image validation remain required. Other response calls have a bounded five-minute timeout. The publisher job allows up to two hours while retaining its validated-story/image checkpoints.

The existing watchdog now checks at 06:50, 08:50, 10:50 and 12:50 America/Toronto. On a live-check failure it dispatches the existing publisher only if no publisher run is active. Published dates skip generation and can recover deployment; unpublished dates resume valid checkpoints. The existing publisher and independent Founder’s Desk schedules remain enabled. GitHub scheduling remains best-effort; verify actual publication rather than promising a future result.

## October 29 cover-review recovery

A Culture Daily Read cover was rejected because its concept mentioned poetry and translator credits while both generation and review prohibited visible text. Written material in a scene concept is now explicitly thematic context: show the companions, activity and props without readable lettering. Review retains checks for two people, relevance, artifacts and original editorial quality, but does not demand readable credits or passages. A narrowly scoped legacy publisher-hash restore key preserves validated same-day stories and covers through this instruction repair; current-code caches remain preferred. Publication still requires the complete ten-story/sixteen-image edition and all checks. No schedule, billing setting, page design or archive content changed.

The combined magazine/note workflow now rebuilds derived homepage/catalog files before validation, including already-published recovery runs. It commits the generated homepage with each complete publication so the source issue badge matches the dated edition manifests. This aligns the combined Founder’s Desk path with the existing independent note workflow; it does not weaken tests or regenerate an existing edition.

Pages packages now include the source revision and run-attempt number in their artifact names. Upload and deployment use the identical name, so the magazine and subsequent Founder’s Desk deployment in one workflow cannot collide with each other or an earlier retry.
