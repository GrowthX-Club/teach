#!/bin/sh
# Checks for a newer teach and installs it, so the learner never types a command.
# Usage:
#   sh update.sh check   prints UPDATE=available CURRENT=x LATEST=y, or UPDATE=none
#   sh update.sh check --now   asks GitHub right away and ignores a skipped version
#   sh update.sh skip    stops asking about the latest version seen
#   sh update.sh apply   installs the latest version, prints UPDATED=yes|no
#
# check asks GitHub at most once a day, gives up after a few seconds offline,
# and sends nothing about the learner. TEACH_NO_UPDATE_CHECK=1 turns it off.

set -u

repo="GrowthX-Club/teach"
latest_url="https://raw.githubusercontent.com/$repo/main/.claude-plugin/plugin.json"
skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}
state="$teach_home/update-check"
day=86400

version_in() { sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9][0-9.]*\)".*/\1/p' "$1" 2>/dev/null | head -n 1; }

# Where this copy came from: the plugin (manifest two folders up), a git clone, or install.sh (.version).
root=$(CDPATH= cd -- "$skill_dir/../.." 2>/dev/null && pwd)
how=unknown
current=""
if [ -f "$root/.claude-plugin/plugin.json" ]; then
  current=$(version_in "$root/.claude-plugin/plugin.json")
  if [ -d "$root/.git" ]; then how=clone; else how=plugin; fi
elif [ -f "$skill_dir/.version" ]; then
  current=$(sed -n '1p' "$skill_dir/.version")
  how=copy
fi

newer() { # newer A B: true when version A is above B
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | awk -F. '{ printf "%05d%05d%05d %s\n", $1, $2, $3, $0 }' | sort | tail -n 1 | cut -d' ' -f2)" = "$1" ]
}

read_state() { [ -f "$state" ] && sed -n "s/^$1=//p" "$state" | head -n 1; }

write_state() { # write_state checked latest skipped
  mkdir -p "$teach_home"
  printf 'checked=%s\nlatest=%s\nskipped=%s\n' "$1" "$2" "$3" > "$state"
}

fetch_latest() {
  if command -v curl >/dev/null 2>&1; then curl -fsS --max-time 4 "$latest_url" 2>/dev/null
  elif command -v wget >/dev/null 2>&1; then wget -qO- -T 4 "$latest_url" 2>/dev/null
  fi | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9][0-9.]*\)".*/\1/p' | head -n 1
}

case "${1:-}" in
  check)
    if [ "${TEACH_NO_UPDATE_CHECK:-0}" = 1 ] || [ -z "$current" ] || [ "$how" = clone ]; then echo "UPDATE=none"; exit 0; fi
    now=$(date +%s)
    checked=$(read_state checked); latest=$(read_state latest); skipped=$(read_state skipped)
    if [ "${2:-}" = --now ]; then skipped_for_check=""; else skipped_for_check=$skipped; fi
    if [ "${2:-}" = --now ] || [ -z "$checked" ] || [ $((now - checked)) -ge $day ]; then
      fetched=$(fetch_latest)
      if [ -n "$fetched" ]; then latest=$fetched; write_state "$now" "$latest" "$skipped"; fi
    fi
    if [ -n "$latest" ] && newer "$latest" "$current" && [ "$latest" != "$skipped_for_check" ]; then
      echo "UPDATE=available CURRENT=$current LATEST=$latest"
    else
      echo "UPDATE=none"
    fi
    ;;
  skip)
    write_state "$(read_state checked)" "$(read_state latest)" "$(read_state latest)"
    echo "SKIPPED=$(read_state latest)"
    ;;
  apply)
    ok=no
    case "$how" in
      plugin)
        if command -v claude >/dev/null 2>&1 \
          && claude plugin marketplace update growthx >/dev/null 2>&1 \
          && claude plugin update teach@growthx >/dev/null 2>&1; then ok=yes; fi
        ;;
      copy)
        if command -v curl >/dev/null 2>&1 \
          && curl -fsSL "https://raw.githubusercontent.com/$repo/main/install.sh" | sh >/dev/null 2>&1; then ok=yes; fi
        ;;
    esac
    if [ "$ok" = yes ]; then
      rm -f "$state"
      echo "UPDATED=yes"
    else
      echo "UPDATED=no HOW=$how"
    fi
    ;;
  *)
    echo "usage: sh update.sh check|skip|apply" >&2
    exit 2
    ;;
esac
