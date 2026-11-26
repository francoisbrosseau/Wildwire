#!/usr/bin/env bash
# Bound artifact visibility waiting without ever selecting an earlier attempt.
: "${GH_REPO:?GH_REPO is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
: "${PAGES_ARTIFACT:?PAGES_ARTIFACT is required}"
set -euo pipefail
for attempt in {1..12}; do
  count=$(gh api "repos/$GH_REPO/actions/runs/$GITHUB_RUN_ID/artifacts?per_page=100" --jq "[.artifacts[] | select(.name == \"$PAGES_ARTIFACT\")] | length")
  if [ "$count" = 1 ]; then exit 0; fi
  if [ "$count" -gt 1 ]; then
    echo "::error::Multiple artifacts named $PAGES_ARTIFACT. Refusing ambiguous deployment."
    exit 1
  fi
  sleep 5
done
echo "::error::Pages artifact metadata not visible after 60s; retry deployment."
exit 1
