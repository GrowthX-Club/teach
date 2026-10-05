#!/bin/sh
# Starts the teach playground in the background and prints its URL.
# It stops by itself after two hours without use.
# Usage: sh playground.sh

set -eu

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}

command -v node >/dev/null 2>&1 || { echo "The playground needs Node.js." >&2; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "The playground needs the Claude Code command line (claude), installed and logged in." >&2; exit 1; }

sh "$skill_dir/scripts/setup.sh" >/dev/null
log="$teach_home/playground/server.log"
mkdir -p "$teach_home/playground"

port=""
for p in 8741 8742 8743 8744 8745 8746 8747 8748 8749 8750; do
  if ! curl -s -o /dev/null -m 1 "http://localhost:$p/health" 2>/dev/null; then port=$p; break; fi
done
[ -n "$port" ] || { echo "No free port between 8741 and 8750." >&2; exit 1; }

: > "$log"
nohup node "$skill_dir/playground/server.mjs" --port "$port" --home "$teach_home" > "$log" 2>&1 &

i=0
while [ "$i" -lt 50 ]; do
  url=$(sed -n 's/^PLAYGROUND_URL=//p' "$log" | head -n 1)
  if [ -n "$url" ]; then
    echo "$url"
    exit 0
  fi
  sleep 0.2
  i=$((i + 1))
done
echo "The playground did not start. See $log" >&2
exit 1
