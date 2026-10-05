#!/bin/sh
# Serves lessons on http://localhost and prints the lesson's URL.
# With node: the teach lesson server (lessons, library and the in-lesson chat),
# reused if one is already running for this teach folder, and stopping by
# itself after 12 hours without use. Without node: python3, then nc (lesson
# page only, no chat), stopping after 12 hours.
# Usage: sh serve.sh <lesson-dir>

set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: sh serve.sh <lesson-dir>" >&2
  exit 2
fi

teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}
teach_home=$(CDPATH= cd -- "$teach_home" && pwd)
lesson_dir=$(CDPATH= cd -- "$1" && pwd)
lesson_name=$(basename "$lesson_dir")
lifetime=43200
skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

[ -f "$lesson_dir/index.html" ] || { echo "No index.html in $lesson_dir. Build it first." >&2; exit 1; }

up() { curl -s -o /dev/null -m 1 "http://localhost:$1/" 2>/dev/null; }

# On macOS without developer tools, /usr/bin/python3 is a stub that pops up an
# install dialog; only use it when the developer tools are really there.
has_python() {
  command -v python3 >/dev/null 2>&1 || return 1
  if [ "$(command -v python3)" = /usr/bin/python3 ] && [ "$(uname)" = Darwin ]; then
    xcode-select -p >/dev/null 2>&1 || return 1
  fi
  python3 -c 'import sys; sys.exit(sys.version_info < (3, 7))' 2>/dev/null
}

path="/lessons/$lesson_name/index.html"

# Reuse a teach lesson server that already serves this teach folder.
if command -v node >/dev/null 2>&1; then
  for p in 8731 8732 8733 8734 8735 8736 8737 8738 8739 8740; do
    info=$(curl -s -m 1 "http://localhost:$p/api/health" 2>/dev/null || true)
    case "$info" in
      *'"teach":true'*)
        if printf '%s' "$info" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.exit(JSON.parse(s).home===process.argv[1]?0:1))' "$teach_home"; then
          echo "http://localhost:$p$path"
          exit 0
        fi ;;
    esac
  done
fi

port=""
for p in 8731 8732 8733 8734 8735 8736 8737 8738 8739 8740; do
  if ! up "$p"; then port=$p; break; fi
done
[ -n "$port" ] || { echo "No free port between 8731 and 8740." >&2; exit 1; }


if command -v node >/dev/null 2>&1; then
  nohup node "$skill_dir/scripts/lesson-server.mjs" --port "$port" --home "$teach_home" >/dev/null 2>&1 &
elif has_python; then
  nohup sh -c 'python3 -m http.server "$1" --bind 127.0.0.1 --directory "$2" & pid=$!; sleep "$3"; kill "$pid"' \
    _ "$port" "$teach_home" "$lifetime" >/dev/null 2>&1 &
elif command -v nc >/dev/null 2>&1; then
  # nc answers every request with the lesson page, so serve it at the root.
  path="/"
  nohup sh -c '
    end=$(( $(date +%s) + $3 ))
    ( sleep "$3"; curl -s -o /dev/null -m 1 "http://localhost:$1/" ) &
    while [ "$(date +%s)" -lt "$end" ]; do
      { printf "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n"; cat "$2"; } \
        | nc -l localhost "$1" >/dev/null 2>&1 || sleep 1
    done
  ' _ "$port" "$lesson_dir/index.html" "$lifetime" >/dev/null 2>&1 &
else
  echo "Cannot start a local server: node, python3 and nc are all missing." >&2
  exit 1
fi

i=0
while [ "$i" -lt 30 ]; do
  if up "$port"; then
    echo "http://localhost:$port$path"
    exit 0
  fi
  sleep 0.2
  i=$((i + 1))
done
echo "The local server did not start." >&2
exit 1
