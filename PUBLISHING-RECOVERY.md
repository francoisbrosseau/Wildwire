# Independent morning publication recovery

Approved by the owner on November 9, 2026 after missed scheduled starts.

The normal GitHub schedules remain enabled. A separate recurring ChatGPT task
checks early enough to recover before the 07:00 America/Cancun reading target.
GitHub scheduled events can be delayed or dropped; a green run from yesterday
is not evidence that today's edition exists.

Before triggering recovery, fetch fresh main, today's edition manifest, public
homepage date and current publisher runs. If a publisher is queued/in progress,
observe it instead of starting another. If today's complete edition is live,
perform no write. If today's complete source exists but public content is stale,
recover deployment without generating replacement articles.

The narrowly scoped `.github/recover-daily-edition` push on main starts the
existing publisher. Only an authorized missing/stale current-day recovery may
change this marker. Use the connected GitHub app create_tree based on the fresh
main tree, create_commit and update_ref(expected_sha, force=false). On a changed
main refetch and reassess before retrying; never overwrite a published date.

The publisher retains its current date guard, editorial checks, cache recovery,
concurrency lock, complete-edition validation and explicit Pages/live verification.
Never publish a partial edition, relabel yesterday, replace archive records,
read secret values or alter billing. Retry only recoverable failures with saved
progress; stop on auth/quota or substantive editorial errors and report the exact
stage/run. A trigger or commit alone is not publication success.

Keep the independent recovery task enabled after every occurrence, including
successful and already-published checks. This is continuing daily maintenance,
not a one-time reminder. HAYVN generation and its newsletter freshness guard
remain separately managed and must not depend on either magazine succeeding.
