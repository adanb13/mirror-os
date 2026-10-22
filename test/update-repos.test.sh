#!/usr/bin/env bash
set -euo pipefail
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_temp=$(cd -- "${TMPDIR:-/tmp}" && pwd -P)
fixture=$(mktemp -d "$test_temp/mirror-os-update-test.XXXXXX")
trap 'case "$fixture" in "$test_temp"/mirror-os-update-test.*) rm -rf -- "$fixture" ;; esac' EXIT
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME='Mirror Test' GIT_AUTHOR_EMAIL='mirror-test@example.invalid'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
git init -q --bare --initial-branch=main "$fixture/remote.git"
git clone -q "$fixture/remote.git" "$fixture/seed"
printf 'initial\n' > "$fixture/seed/content.txt"
git -C "$fixture/seed" add .
git -C "$fixture/seed" commit -qm initial
git -C "$fixture/seed" push -q origin main
mkdir "$fixture/checkouts"
for name in 'clean with spaces' dirty detached diverged ahead untracked unconfigured operation; do
  git clone -q "$fixture/remote.git" "$fixture/checkouts/$name"
done
base=$(git -C "$fixture/seed" rev-parse HEAD)
printf '%s\n' "$base" > "$fixture/checkouts/operation/.git/MERGE_HEAD"
printf 'local edit\n' > "$fixture/checkouts/dirty/content.txt"
printf 'local untracked\n' > "$fixture/checkouts/untracked/keep.txt"
git -C "$fixture/checkouts/detached" checkout -q --detach
printf 'local commit\n' > "$fixture/checkouts/diverged/local.txt"
git -C "$fixture/checkouts/diverged" add .
git -C "$fixture/checkouts/diverged" commit -qm local
local_head=$(git -C "$fixture/checkouts/diverged" rev-parse HEAD)
git -C "$fixture/checkouts/unconfigured" branch --unset-upstream
printf 'remote update\n' > "$fixture/seed/content.txt"
git -C "$fixture/seed" commit -qam update
git -C "$fixture/seed" push -q origin main
target=$(git -C "$fixture/seed" rev-parse HEAD)
git -C "$fixture/checkouts/ahead" pull -q --ff-only
printf 'ahead\n' > "$fixture/checkouts/ahead/ahead.txt"
git -C "$fixture/checkouts/ahead" add .
git -C "$fixture/checkouts/ahead" commit -qm ahead
ahead_head=$(git -C "$fixture/checkouts/ahead" rev-parse HEAD)
if bash "$project/scripts/update-repos.sh" "$fixture/checkouts" "$fixture/checkouts" > "$fixture/result.txt" 2>&1; then
  echo 'Expected attention status for protected checkouts.' >&2; exit 1
fi
[[ $(git -C "$fixture/checkouts/clean with spaces" rev-parse HEAD) == "$target" ]]
[[ $(git -C "$fixture/checkouts/dirty" rev-parse HEAD) == "$base" ]]
[[ $(cat "$fixture/checkouts/dirty/content.txt") == 'local edit' ]]
[[ $(git -C "$fixture/checkouts/detached" rev-parse HEAD) == "$base" ]]
[[ $(git -C "$fixture/checkouts/diverged" rev-parse HEAD) == "$local_head" ]]
[[ $(git -C "$fixture/checkouts/ahead" rev-parse HEAD) == "$ahead_head" ]]
[[ $(cat "$fixture/checkouts/untracked/keep.txt") == 'local untracked' ]]
[[ $(git -C "$fixture/checkouts/unconfigured" rev-parse HEAD) == "$base" ]]
[[ $(git -C "$fixture/checkouts/operation" rev-parse HEAD) == "$base" ]]
[[ -f "$fixture/checkouts/operation/.git/MERGE_HEAD" ]]
grep -q 'Found 8 repositories: 1 updated, 0 already current, 7 need attention.' "$fixture/result.txt"
echo 'Repository updater passed: clean checkout updated; edits, detached state, local commits, untracked files, Git operations and unconfigured tracking preserved; duplicate roots handled.'
