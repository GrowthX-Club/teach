#!/bin/sh
# Builds one self-contained lesson page and refreshes the lesson library.
# Usage: sh build.sh [--open] <lesson-dir>
#   --open  also open the lesson in the default browser (for terminal users)
# Needs only POSIX sh, sed and awk.

set -eu

open_after=false
if [ "${1:-}" = "--open" ]; then
  open_after=true
  shift
fi
if [ "$#" -ne 1 ]; then
  echo "Usage: sh build.sh [--open] <lesson-dir>" >&2
  exit 2
fi

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
assets="$skill_dir/assets"
teach_home=${TEACH_HOME:-"$HOME/growthx-teach"}
lesson_dir=$(CDPATH= cd -- "$1" && pwd)
lesson_json="$lesson_dir/lesson.json"

if [ ! -f "$lesson_json" ]; then
  echo "No lesson.json in $lesson_dir" >&2
  exit 1
fi

sh "$skill_dir/scripts/setup.sh" >/dev/null
theme="$teach_home/theme.css"

tmp=$(mktemp -d "${TMPDIR:-/tmp}/teach-build.XXXXXX")
trap 'rm -rf "$tmp"' EXIT

# Replace a placeholder line in a template with a file's contents.
# inline <template> <out> <placeholder> <file> [<placeholder> <file> ...]
inline() {
  template=$1
  out=$2
  shift 2
  awk -v pairs="$*" '
    BEGIN {
      n = split(pairs, parts, "\034")
      for (i = 1; i + 1 <= n; i += 2) files[parts[i]] = parts[i + 1]
    }
    {
      key = $0
      gsub(/^[ \t]+|[ \t]+$/, "", key)
      if (key in files) {
        while ((getline line < files[key]) > 0) print line
        close(files[key])
      } else print
    }
  ' "$template" > "$out"
}
sep=$(printf '\034')

# JSON inside <script type="application/json">: escape "<" so no "</script" can end it early.
sed 's/</\\u003c/g' "$lesson_json" > "$tmp/lesson.safe.json"
sed 's/</\\u003c/g' "$skill_dir/references/catalogue.json" > "$tmp/catalogue.safe.json"

inline "$assets/lesson.html" "$tmp/index.html" \
  "/*@@THEME@@*/${sep}$theme${sep}/*@@BASE@@*/${sep}$assets/base.css${sep}/*@@LESSON@@*/${sep}$tmp/lesson.safe.json${sep}/*@@CATALOGUE@@*/${sep}$tmp/catalogue.safe.json${sep}/*@@APP@@*/${sep}$assets/app.js"
mv "$tmp/index.html" "$lesson_dir/index.html"

# Library entry for this lesson. One file per lesson, so one broken lesson cannot break the library.
lesson_name=$(basename "$lesson_dir")
{
  printf 'window.LIBRARY.push({"dir":"%s","lesson":' "$lesson_name"
  cat "$lesson_json"
  printf '});\n'
} > "$lesson_dir/library-entry.js"

# Rebuild the library page from every built lesson under <home>/lessons.
# lessons/library.js holds every entry too, so each lesson page can link to the others.
: > "$tmp/entries.html"
: > "$tmp/library.js"
for entry in "$teach_home"/lessons/*/library-entry.js; do
  [ -f "$entry" ] || continue
  name=$(basename "$(dirname "$entry")")
  case "$name" in
    *[!a-z0-9-]*) continue ;;
  esac
  printf '<script src="lessons/%s/library-entry.js"></script>\n' "$name" >> "$tmp/entries.html"
  cat "$entry" >> "$tmp/library.js"
done
mkdir -p "$teach_home/lessons"
mv "$tmp/library.js" "$teach_home/lessons/library.js"
inline "$assets/library.html" "$tmp/library.html" \
  "/*@@THEME@@*/${sep}$theme${sep}/*@@BASE@@*/${sep}$assets/base.css${sep}/*@@CATALOGUE@@*/${sep}$tmp/catalogue.safe.json${sep}<!--@@ENTRIES@@-->${sep}$tmp/entries.html"
mv "$tmp/library.html" "$teach_home/index.html"

# file:// URLs with spaces and other unsafe characters escaped.
file_url() {
  printf 'file://%s' "$1" | sed -e 's/%/%25/g' -e 's/ /%20/g' -e 's/#/%23/g' -e 's/?/%3F/g'
}
lesson_url=$(file_url "$lesson_dir/index.html")
library_url=$(file_url "$teach_home/index.html")

opened=no
if [ "$open_after" = true ]; then
  if command -v open >/dev/null 2>&1 && open "$lesson_dir/index.html" >/dev/null 2>&1; then opened=yes
  elif command -v xdg-open >/dev/null 2>&1 && xdg-open "$lesson_dir/index.html" >/dev/null 2>&1; then opened=yes
  elif command -v cmd.exe >/dev/null 2>&1 && cmd.exe /c start "" "$lesson_dir/index.html" >/dev/null 2>&1; then opened=yes
  fi
fi

echo "LESSON_FILE=$lesson_dir/index.html"
echo "LESSON_URL=$lesson_url"
echo "LIBRARY_URL=$library_url"
echo "OPENED=$opened"
