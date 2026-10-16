# WILDWIRE daily publishing

## Current state

The five-story editorial engine and sample edition are prepared in a review branch. **Production publishing is not active.** No API key was added, no paid API call was made, and the recurring workflow will remain off until the owner reviews the sample, cost and live-publish test.

The engine is designed for five new stories per Toronto calendar day—one for each pillar. It uses a separately billed OpenAI API key for research, writing, fact-checking and generated images. ChatGPT access does not include API usage.

## Scheduled process

- GitHub Actions uses the IANA timezone America/Toronto; the schedule therefore follows daylight saving time.
- It makes attempts at 3:17 and 5:17 a.m. local time. The later attempt acts as one retry if an earlier run fails; a complete edition already in the archive is detected and not regenerated.
- A run must pass its publication cutoff at 6:40 a.m. Toronto time. The job then commits the full edition in one change, runs GitHub Pages deployment through the existing branch publishing setup, and polls WildWireMag.com for all five article IDs and image files.
- The homepage selects the newest complete edition for its existing feature and story cards. Article IDs and URLs remain permanent; categories, search and favorites continue to use the shared catalog.
- A partial edition is never committed. Research, citation, length, duplicate-title, image-format, catalog and site checks must all pass first.
- Generated images must center a couple, family or friends, with varied people and compositions across the five pillars. They are labeled as AI-generated editorial illustrations.
- A failed run writes a failure summary and opens a GitHub issue. The previous live edition remains available if a candidate fails before deployment.

GitHub's own documentation says scheduled workflows can be delayed or dropped during periods of high load. The early schedule, one retry, cutoff and live-site verification reduce that risk, but GitHub Actions cannot guarantee that the site will be live at exactly 7:00 every day. See [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [workflow timezone syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule).

## ChatGPT Work scheduling

ChatGPT scheduled automations can run a scheduled prompt, but they are not the deployment runtime for this GitHub Pages project. They do not provide this repository's persistent build environment, API secret handling, atomic commit, Pages verification and retry controls as one guaranteed unattended publishing job. The engine uses GitHub Actions instead. WILDWIRE_AUTO_PUBLISH is the pause/resume switch; a separate WILDWIRE_LIVE_APPROVED variable provides the one-time launch gate.

## Cost estimate

Planning estimate for five articles and five 1536 × 1024 medium-quality generated images each day: **about $20–$35 USD/month** for model tokens, roughly ten web-search calls per day, one image and one automated visual check per article, assuming no unusually heavy retries. This is an estimate, not a quote; actual image-token usage, search context, model prices and failed retries can change it. GitHub Actions is expected to be $0 for this public repository's standard hosted workflow. Before activation, configure a $40 hard spending limit for the API organization or project. A monthly project spend alert is only a soft threshold and will not stop requests; a hard limit can stop them, but enforcement may lag and slightly exceed the configured amount. See [OpenAI API spend-limit guidance](https://help.openai.com/en/articles/6614457-troubleshooting-api-usage-and-spend-limits). The repo cannot set or enforce account billing limits.

Current model and image prices are listed at [OpenAI API pricing](https://developers.openai.com/api/docs/pricing). Web search is priced per call and search-content tokens are additional at the chosen model rate.

## Activation checklist

Keep the schedule off until these steps are reviewed and approved:

1. Merge the reviewed engine and sample edition after approving their content.
2. Add OPENAI_API_KEY as a GitHub Actions repository secret. Do not put it in source files or issue text.
3. Set the OpenAI project spending limit to $40/month or less.
4. Run the workflow manually with dry_run: true; it will generate and validate but will not commit.
5. Approve a clearly identified live test publication, then confirm GitHub Pages and WildWireMag.com serve it.
6. Confirm the Actions token can push to main under the repository’s branch protection rules. The connected GitHub view cannot read those settings.
7. Only after that approval, set repository variables WILDWIRE_AUTO_PUBLISH to enabled and WILDWIRE_LIVE_APPROVED to yes.

Without both variables set to their exact values, scheduled jobs skip publishing. Remove or change WILDWIRE_AUTO_PUBLISH to pause; set it back to enabled to resume. Manual runs default to dry-run and never publish.

## Rollback

If a published edition needs to be withdrawn, revert the single “Publish WILDWIRE daily edition” commit on main; GitHub Pages will redeploy the prior archive. This preserves all older permanent articles. For a failed pre-publication check, no rollback is needed because no article commit is made.

## Verification limits

The sample edition and homepage/archive integration pass local content and DOM tests. The workflow has not yet been run against a real API key, its generated images have not been produced by the API path, and no test edition has been deployed to WildWireMag.com. Those are deliberate remaining gates: the API requires separate billing and a public test deployment must be explicitly approved.
