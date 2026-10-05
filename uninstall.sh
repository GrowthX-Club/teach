#!/bin/sh
# Removes the teach skill from Claude Code and Codex.
# Your lessons, profile and theme in ~/growthx-teach (or $TEACH_HOME) are kept.

set -eu

for dest in "$HOME/.claude/skills/teach" "$HOME/.agents/skills/teach"; do
  if [ -d "$dest" ] && [ -f "$dest/SKILL.md" ] && grep -q "^name: teach$" "$dest/SKILL.md"; then
    rm -rf "$dest"
    printf '  ✓ removed %s\n' "$dest"
  fi
done

printf 'Your lessons are still in %s. Delete that folder yourself if you want them gone.\n' "${TEACH_HOME:-$HOME/growthx-teach}"
