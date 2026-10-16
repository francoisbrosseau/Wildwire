# WILDWIRE publication operations

## Verified state — October 16, 2026

- The API key is present as a GitHub Actions secret. Real tests have successfully
  generated and fact-checked a Strength story and generated/reviewed its image.
- A complete eight-story/thirteen-image unattended run has **not yet passed**.
  The latest original run (#19) stopped after a source registry mismatch in its
  second article. Existing public content was not changed.
- Recurring production is **off**. Both launch variables were absent when checked.
  The owner's reported $16 payment and $40 billing cap have not been independently
  verified. Do not claim to know the remaining API credit balance.
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

The repository's **Settings → Pages → Source must be GitHub Actions** before
using pages.yml. The repository currently uses main/root branch publishing.
Prepare and validate the workflow before changing that setting. Once migrated,
ordinary pushes to main, manual deploys, and the daily engine all use pages.yml.
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
- Do not enable until a complete preview AND the Pages/live path pass.

GitHub may delay scheduled runs; this is a target with retries and monitoring,
not a guarantee of exact daily availability. Official references:
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
https://docs.github.com/en/actions/concepts/security/github_token
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Cost

The earlier $20–$35 estimate described five stories/five images. It must not be
reused for the approved edition's eight stories/thirteen images, additional
research and fact-check calls, and retries. Measure real usage from report.json
and the OpenAI Platform billing dashboard before declaring this volume sustainable
at $40/month. Price reference: https://developers.openai.com/api/docs/pricing
API billing is separate from ChatGPT. The repository cannot inspect or enforce
an account billing limit. Until full-run costs and reliability are measured,
manual editions or a lower publishing frequency are the honest fallback.

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
