# WILDWIRE daily publishing — not active

WILDWIRE does **not** currently publish articles on a schedule. The daily workflow is not part of the launch branch, no AI API secret or enablement variable is configured, and no recurring publication is authorized. Do not describe tomorrow's edition as automatic.

## Proposed design

The local draft pipeline targets 7:00 a.m. `America/Toronto` and proposes one article only when research, source, image-rights, originality, length, content-build and functional checks all pass. It uses an API-backed model and would require an `OPENAI_API_KEY` secret. A repository variable would act as a pause switch. A manual dry run must pass before any default-branch schedule is enabled.

This proposal has not been deployed or tested end to end. GitHub Actions has no API allowance bundled with ChatGPT. API usage and any image-provider costs require review and approval before activation. No unattended workflow should be merged or enabled until the owner explicitly approves its exact behavior and budget.

## Safeguards required before activation

- Run a manual dry run that creates no commit and no public article.
- Review sources, article quality, duplicate detection and image license/attribution.
- Confirm build and site tests pass before a generated commit can be created.
- Keep publication paused by default; provide a documented pause switch and rollback procedure.
- Test a clearly identified end-to-end test publication only with the owner's approval.
- Report failures through GitHub Actions logs and confirm the prior site remains deployable.

The current recommendation is to finish and verify reader accounts and the custom domain first. Daily publication remains a later milestone.
