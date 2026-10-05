#!/bin/sh
# Installs GrowthX teach for Claude Code and/or Codex, and sets up the local teach folder.
#
# From a clone:   sh install.sh
# From GitHub:    curl -fsSL https://raw.githubusercontent.com/GrowthX-Club/teach/main/install.sh | sh
#
# Overrides: TEACH_HOME (default ~/growthx-teach), TEACH_INSTALL_CLAUDE / TEACH_INSTALL_CODEX (1 or 0).

set -eu

repo="GrowthX-Club/teach"
ref=${TEACH_REF:-main}
teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}

say() { printf '%s\n' "$*"; }
fail() { printf 'teach: %s\n' "$*" >&2; exit 1; }

# ---- find the skill source: this clone, or a fresh download ----
script_dir=""
case "$0" in
  */install.sh|install.sh) script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) ;;
esac

tmp=""
cleanup() { if [ -n "$tmp" ]; then rm -rf "$tmp"; fi; }
trap cleanup EXIT

if [ -n "$script_dir" ] && [ -f "$script_dir/skills/teach/SKILL.md" ]; then
  source_dir="$script_dir/skills/teach"
else
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/teach-install.XXXXXX")
  url="https://codeload.github.com/$repo/tar.gz/refs/heads/$ref"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$tmp/teach.tar.gz" || fail "could not download $repo. If the repo is private, clone it and run: sh install.sh"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp/teach.tar.gz" "$url" || fail "could not download $repo. If the repo is private, clone it and run: sh install.sh"
  else
    fail "needs curl or wget to download. Or clone the repo and run: sh install.sh"
  fi
  tar -xzf "$tmp/teach.tar.gz" -C "$tmp"
  source_dir=$(find "$tmp" -path '*/skills/teach/SKILL.md' -print | head -n 1 | xargs dirname)
  [ -n "$source_dir" ] || fail "downloaded archive has no skills/teach"
fi

# ---- detect agents ----
want() {
  case "$1" in
    1|true|yes) return 0 ;;
    0|false|no) return 1 ;;
  esac
  return 2
}

claude=false
if want "${TEACH_INSTALL_CLAUDE:-auto}"; then claude=true
elif [ $? -eq 2 ] && { command -v claude >/dev/null 2>&1 || [ -d "$HOME/.claude" ]; }; then claude=true
fi

codex=false
if want "${TEACH_INSTALL_CODEX:-auto}"; then codex=true
elif [ $? -eq 2 ] && { command -v codex >/dev/null 2>&1 || [ -d "$HOME/.codex" ]; }; then codex=true
fi

[ "$claude" = true ] || [ "$codex" = true ] || fail "could not find Claude Code or Codex. Install one, then run this again."

# ---- copy the skill (replacing any previous teach install) ----
install_to() {
  dest=$1
  mkdir -p "$(dirname -- "$dest")"
  staging="$dest.installing.$$"
  rm -rf "$staging"
  cp -R "$source_dir" "$staging"
  rm -rf "$dest"
  mv "$staging" "$dest"
  say "  ✓ $dest"
}

say "Installing GrowthX teach"
[ "$claude" = true ] && install_to "$HOME/.claude/skills/teach"
[ "$codex" = true ] && install_to "$HOME/.agents/skills/teach"

# ---- local teach folder: theme, profile, lessons ----
mkdir -p "$teach_home/lessons"
if [ ! -f "$teach_home/theme.css" ]; then
  cp "$source_dir/assets/theme.css" "$teach_home/theme.css"
elif ! cmp -s "$source_dir/assets/theme.css" "$teach_home/theme.css"; then
  cp "$source_dir/assets/theme.css" "$teach_home/theme.default.css"
  say "  · kept your theme.css; the latest default is in theme.default.css"
fi
[ -f "$teach_home/profile.json" ] || printf '{\n  "version": 1,\n  "lens": "balanced",\n  "domains": {},\n  "notes": [],\n  "history": []\n}\n' > "$teach_home/profile.json"
say "  ✓ $teach_home"

command -v node >/dev/null 2>&1 || say "  · node not found: lessons still build, but validation is skipped"

say ""
say "Done. Restart your coding agent, then type: teach"
