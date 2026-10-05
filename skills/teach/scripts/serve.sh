#!/bin/sh
# Serves a built lesson on http://localhost for an in-app browser that cannot
# open local files (the Claude desktop app). Stops by itself after an hour.
# Uses node, then python3, then nc (lesson page only). Prints the URL.
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
lifetime=3600

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

port=""
for p in 8731 8732 8733 8734 8735 8736 8737 8738 8739 8740; do
  if ! up "$p"; then port=$p; break; fi
done
[ -n "$port" ] || { echo "No free port between 8731 and 8740." >&2; exit 1; }

path="/lessons/$lesson_name/index.html"

if command -v node >/dev/null 2>&1; then
  nohup node -e '
    const http = require("http"), fs = require("fs"), path = require("path");
    const root = process.argv[1], port = Number(process.argv[2]), life = Number(process.argv[3]);
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
    http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(root, path.normalize(p));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    }).listen(port, "127.0.0.1");
    setTimeout(() => process.exit(0), life * 1000);
  ' "$teach_home" "$port" "$lifetime" >/dev/null 2>&1 &
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
