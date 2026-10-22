#!/usr/bin/env bash
# Update readable Git checkouts without overwriting local work.
set -uo pipefail

if [[ ${1:-} == --help ]]; then
  echo 'Usage: bash scripts/update-repos.sh [SEARCH_ROOT ...]'
  echo 'Defaults: /home /opt /srv /usr/local/src /mnt /media (existing directories only).'
  echo 'Fetches all remotes, then fast-forwards clean branches to their configured tracking branch.'
  echo 'Does not push, reset, stash, install packages, restart services or update submodules.'
  exit 0
fi
if ! command -v git >/dev/null || ! command -v find >/dev/null; then
  echo 'Git and find are required.' >&2
  exit 1
fi
if (( $# == 0 )); then set -- /home /opt /srv /usr/local/src /mnt /media; fi
roots=()
for root in "$@"; do
  if [[ -d $root && -r $root ]]; then
    roots+=("$(cd -- "$root" && pwd -P)")
  else
    printf 'Not scanned (missing or unreadable): %s\n' "$root" >&2
  fi
done
if (( ${#roots[@]} == 0 )); then echo 'No readable search roots.' >&2; exit 1; fi
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o BatchMode=yes -o ConnectTimeout=10}"
printf 'Scanning readable checkouts under:\n'; printf '  %s\n' "${roots[@]}"
echo 'Run as your normal Pi user. Permission errors are reported; no ownership settings are changed.'
declare -A seen=()
total=0 updated=0 current=0 attention=0
while IFS= read -r -d '' marker; do
  repo=${marker%/.git}
  [[ ${seen["$repo"]:-} ]] && continue
  seen["$repo"]=1
  ((total+=1))
  printf '\nRepository: %s\n' "$repo"
  if ! git -C "$repo" rev-parse --show-toplevel >/dev/null 2>&1; then
    echo 'ATTENTION: unreadable checkout or ownership restriction.'; ((attention+=1)); continue
  fi
  if ! git -C "$repo" fetch --all --no-recurse-submodules; then
    echo 'ATTENTION: fetch failed; check network or repository credentials.'; ((attention+=1)); continue
  fi
  if ! branch=$(git -C "$repo" symbolic-ref --quiet --short HEAD); then
    echo 'ATTENTION: detached checkout; preserved at its current commit.'; ((attention+=1)); continue
  fi
  operation=false
  for state in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
    state_path=$(git -C "$repo" rev-parse --path-format=absolute --git-path "$state")
    if [[ -e $state_path ]]; then operation=true; break; fi
  done
  if [[ $operation == true ]]; then
    echo 'ATTENTION: Git operation in progress; finish it before updating.'; ((attention+=1)); continue
  fi
  if ! status=$(git -C "$repo" status --porcelain --untracked-files=normal); then
    echo 'ATTENTION: cannot inspect local changes.'; ((attention+=1)); continue
  fi
  if [[ -n $status ]]; then
    echo 'ATTENTION: local changes or untracked files; working files preserved.'; ((attention+=1)); continue
  fi
  if ! upstream=$(git -C "$repo" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null); then
    echo 'ATTENTION: no tracking branch configured; no upstream is guessed.'; ((attention+=1)); continue
  fi
  if ! counts=$(git -C "$repo" rev-list --left-right --count "HEAD...$upstream"); then
    echo 'ATTENTION: tracking branch cannot be compared.'; ((attention+=1)); continue
  fi
  read -r ahead behind <<< "$counts"
  printf 'Branch: %s -> %s (ahead %s, behind %s)\n' "$branch" "$upstream" "$ahead" "$behind"
  if (( ahead > 0 )); then
    echo 'ATTENTION: local commits preserved; no reset, merge commit or push performed.'; ((attention+=1)); continue
  fi
  if (( behind == 0 )); then echo 'CURRENT'; ((current+=1)); continue; fi
  if git -C "$repo" merge --ff-only "$upstream"; then
    echo 'UPDATED'; ((updated+=1))
  else
    echo 'ATTENTION: fast-forward failed; resolve this checkout separately.'; ((attention+=1))
  fi
done < <(find "${roots[@]}" \
  -type d \( -name node_modules -o -name .venv -o -name venv -o -name .cache \) -prune -o \
  -name .git \( -type d -o -type f \) -print0 -prune)
printf '\nFound %s repositories: %s updated, %s already current, %s need attention.\n' "$total" "$updated" "$current" "$attention"
echo 'Only readable checkouts in the listed roots were scanned. Add other mount points as arguments.'
if (( total == 0 || attention > 0 )); then exit 1; fi
