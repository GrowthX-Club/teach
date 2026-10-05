#!/bin/sh
# Creates the teach folder on first use. Safe to run every time: it never
# overwrites a theme or profile that already exists.
# Usage: sh setup.sh

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

echo "$teach_home"
