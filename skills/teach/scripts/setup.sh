#!/bin/sh
# Creates the teach folder on first use. Safe to run every time: it never
# overwrites a theme or profile that already exists.
# Usage: sh setup.sh
#
# It also counts the install: see "anonymous install count" below.

set -eu

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}

mkdir -p "$teach_home/lessons"

if [ ! -f "$teach_home/theme.css" ]; then
  cp "$skill_dir/assets/theme.css" "$teach_home/theme.css"
fi

if [ ! -f "$teach_home/profile.json" ]; then
  cat > "$teach_home/profile.json" <<'EOF'
{
  "version": 1,
  "lens": "balanced",
  "domains": {},
  "notes": [],
  "history": []
}
EOF
fi

# ---- anonymous install count ----
# Tells GrowthX that teach is installed somewhere, so installs can be counted
# even when nobody shares feedback. Sends a random id kept in <home>/ping, the
# teach version, how it was installed, which agent and the OS. Nothing about
# the learner, their chats or lessons. Runs on the first install and again when
# the version changes, in the background, and never fails setup.
# TEACH_NO_PING=1 or DO_NOT_TRACK=1 turns it off.
ping_install() {
  [ "${TEACH_NO_PING:-0}" = 1 ] || [ "${DO_NOT_TRACK:-0}" = 1 ] && return 0

  # Where this copy came from: install.sh says so; otherwise the plugin (manifest
  # two folders up) or a copy with .version. A git clone is a developer: skip it.
  root=$(CDPATH= cd -- "$skill_dir/../.." 2>/dev/null && pwd)
  version=""
  channel=${TEACH_PING_CHANNEL:-}
  if [ -f "$root/.claude-plugin/plugin.json" ]; then
    version=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9][0-9.]*\)".*/\1/p' "$root/.claude-plugin/plugin.json" | head -n 1)
    if [ -z "$channel" ]; then
      [ -d "$root/.git" ] && return 0
      channel=plugin
    fi
  elif [ -f "$skill_dir/.version" ]; then
    version=$(sed -n '1p' "$skill_dir/.version")
    [ -n "$channel" ] || channel=script
  fi
  [ -n "$channel" ] || channel=other

  agent=${TEACH_PING_AGENT:-}
  if [ -z "$agent" ]; then
    case "$skill_dir" in
      */.claude/*) agent=claude ;;
      */.agents/*|*/.codex/*) agent=codex ;;
      *) agent=other ;;
    esac
  fi
  case "$(uname -s 2>/dev/null)" in
    Darwin) os=darwin ;;
    Linux) os=linux ;;
    MINGW*|MSYS*|CYGWIN*) os=windows ;;
    *) os=other ;;
  esac

  state="$teach_home/ping"
  id=$(sed -n 's/^id=//p' "$state" 2>/dev/null | head -n 1)
  [ -n "$id" ] && [ "$(sed -n 's/^version=//p' "$state" | head -n 1)" = "$version" ] && return 0
  if [ -z "$id" ]; then
    id=$(od -An -tx1 -N16 /dev/urandom 2>/dev/null | tr -d ' \n')
    [ ${#id} -eq 32 ] || return 0
    printf 'id=%s\n' "$id" > "$state"
  fi

  case "$version" in
    [0-9]*.[0-9]*.[0-9]*) json_version="\"$version\"" ;;
    *) json_version=null ;;
  esac
  body="{\"ping_id\":\"$id\",\"version\":$json_version,\"channel\":\"$channel\",\"agent\":\"$agent\",\"os\":\"$os\"}"
  url="${TEACH_API_URL:-https://backend.growthx.club/api/v1}"
  url="${url%/}/teach/pings"
  # The version is recorded only once the ping lands, so a failed one is retried next run.
  (
    if command -v curl >/dev/null 2>&1; then
      curl -fsS --max-time 5 -X POST -H "Content-Type: application/json" -d "$body" "$url"
    elif command -v wget >/dev/null 2>&1; then
      wget -qO- -T 5 --header="Content-Type: application/json" --post-data="$body" "$url"
    else
      false
    fi && printf 'id=%s\nversion=%s\n' "$id" "$version" > "$state"
  ) >/dev/null 2>&1 &
}
ping_install || true

echo "$teach_home"
