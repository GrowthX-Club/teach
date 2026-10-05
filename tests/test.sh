#!/bin/sh
# Smoke tests: validator, build, and installer, all inside a throwaway HOME.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
skill="$root/skills/teach"
work=$(mktemp -d "${TMPDIR:-/tmp}/teach-test.XXXXXX")
trap 'rm -rf "$work"' EXIT

pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1" >&2; exit 1; }

echo "validate"
if node "$skill/scripts/validate.mjs" "$skill/examples/sample.lesson.json" "$skill/examples/sample.concept-map.json" >/dev/null; then pass "sample lesson is valid"; else fail "sample lesson is valid"; fi

bad="$work/bad.json"
node -e 'const l=require(process.argv[1]); l.quiz[0].options.forEach(o=>o.correct=true); l.share.x="x".repeat(300); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$bad"
if node "$skill/scripts/validate.mjs" "$bad" 2>"$work/err"; then fail "broken lesson passed"; fi
if grep -q "exactly one correct" "$work/err" && grep -q "260 characters" "$work/err"; then pass "broken lesson is rejected with reasons"; else fail "broken lesson is rejected with reasons"; fi

long="$work/long.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].explain += " word".repeat(400); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$long"
if node "$skill/scripts/validate.mjs" "$long" 2>"$work/err"; then fail "over-long concept passed"; fi
if grep -q "the limit is 450" "$work/err"; then pass "concepts over 300 words are rejected"; else fail "concepts over 300 words are rejected"; fi

recap="$work/recap.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].examples=[{kind:"your-work",title:"x",text:"y"}]; l.hook="As we discussed in our chat, the bug we fixed was a retry."; console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$recap"
if node "$skill/scripts/validate.mjs" "$recap" 2>"$work/err"; then fail "recap lesson passed"; fi
if grep -q "examples is no longer used" "$work/err" && grep -q "refers back to the chat" "$work/err"; then pass "recaps and chat references are rejected"; else fail "recaps and chat references are rejected"; fi

ai="$work/ai.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].explain += " This is a crucial idea \u2014 not just for engineers but for everyone."; console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$ai"
if node "$skill/scripts/validate.mjs" "$ai" 2>"$work/err"; then fail "AI-sounding lesson passed"; fi
if grep -q 'stock AI word "crucial"' "$work/err" && grep -q "em or en dashes" "$work/err" && grep -q "X but Y" "$work/err"; then pass "AI writing tells are rejected"; else fail "AI writing tells are rejected"; fi
if grep -q "Siqi Chen" "$skill/references/humanizer.LICENSE" && grep -q "^# Humanizer" "$skill/references/humanizer.md"; then pass "humanizer bundled with its licence"; else fail "humanizer bundled with its licence"; fi

if VALIDATE="$skill/scripts/validate.mjs" node -e 'import(require("url").pathToFileURL(process.env.VALIDATE).href).then(m=>{const e=m.validateCatalogue(m.loadCatalogue()); if(e.length){console.error(e.join("\n")); process.exit(1)}})'; then pass "catalogue ids are unique and every next link resolves"; else fail "catalogue ids are unique and every next link resolves"; fi

offtopic="$work/offtopic.json"
node -e 'const l=require(process.argv[1]); l.meta.domain="marketing"; l.concepts[0].name="Retry magic"; console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$offtopic"
if node "$skill/scripts/validate.mjs" "$offtopic" 2>"$work/err"; then fail "non-tech lesson passed"; fi
if grep -q "only covers tech and AI" "$work/err" && grep -q 'catalogue name "Retries with backoff"' "$work/err"; then pass "non-tech areas and off-catalogue names are rejected"; else fail "non-tech areas and off-catalogue names are rejected"; fi

labels_ok=true
for label in "I'm new to this" "I know the basics" "I use it at work" "I know it well"; do
  for f in "$skill/references/level-check.md" "$skill/assets/app.js" "$skill/assets/library.html"; do
    grep -qF "$label" "$f" || { labels_ok=false; printf '    missing "%s" in %s\n' "$label" "$f"; }
  done
done
if [ "$labels_ok" = true ]; then pass "depth labels match the level question everywhere"; else fail "depth labels match the level question everywhere"; fi

if grep -q "run_in_background" "$skill/SKILL.md" && grep -q "Never hand the whole chain to a single agent" "$skill/SKILL.md" && [ "$(grep -c '^## [123]\. ' "$skill/references/agent-prompts.md")" -eq 3 ]; then pass "background mode chains one fresh agent per pass"; else fail "background mode chains one fresh agent per pass"; fi

tag="$work/tag.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].tagline="A catchy line."; console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$tag"
if node "$skill/scripts/validate.mjs" "$tag" 2>"$work/err"; then fail "lesson with a tagline passed"; fi
if grep -q "tagline is no longer used" "$work/err" && ! grep -q 'class="tagline"' "$skill/assets/app.js"; then pass "concepts have no tagline"; else fail "concepts have no tagline"; fi

if grep -q "Always ask both questions" "$skill/references/level-check.md" && grep -q "Always ask both questions" "$skill/SKILL.md" && ! grep -q "use them without asking" "$skill/references/level-check.md"; then pass "level questions are always asked"; else fail "level questions are always asked"; fi

defn="$work/defn.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].explain="Messages get lost all the time." + " word".repeat(110); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$defn"
if node "$skill/scripts/validate.mjs" "$defn" 2>"$work/err"; then fail "bad definition passed"; fi
if grep -q "keep it to 100" "$work/err" && grep -q "must name the concept" "$work/err"; then pass "explanations stay under 100 words and name the concept"; else fail "explanations stay under 100 words and name the concept"; fi

v3="$work/v3.json"
node -e 'const l=require(process.argv[1]); l.concepts[0].explain="Retries with backoff means trying again later."; delete l.concepts[1].visual; delete l.concepts[2].story; l.glossary.push({term:"quantum flux",tip:"Not in the text."}); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$v3"
if node "$skill/scripts/validate.mjs" "$v3" 2>"$work/err"; then fail "lesson without story, diagram or analogy passed"; fi
if grep -q "opens with a definition" "$work/err" && grep -q "visual is required" "$work/err" && grep -q "story is required" "$work/err" && grep -q '"quantum flux" never appears' "$work/err"; then pass "every concept needs a story, an analogy-first explanation and a diagram; glossary terms must appear"; else fail "every concept needs a story, an analogy-first explanation and a diagram; glossary terms must appear"; fi
if ! grep -q 'data-lens' "$skill/assets/app.js" && grep -q "function drawSketch" "$skill/assets/app.js" && grep -q "applyGlossary" "$skill/assets/app.js"; then pass "page has sketch diagrams and jargon tips, no focus switch"; else fail "page has sketch diagrams and jargon tips, no focus switch"; fi

polish="$work/polish.json"
node -e 'const l=require(process.argv[1]); l.meta.title="Why safe retries need idempotency"; l.concepts[0].code={text:"x()"}; l.concepts[0].real_world="Too short."; l.concepts[1].pitfalls=["Only one."]; console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$polish"
if node "$skill/scripts/validate.mjs" "$polish" 2>"$work/err"; then fail "jargon title, code or thin sections passed"; fi
if grep -q "make the title an analogy" "$work/err" && grep -q "code is no longer used" "$work/err" && grep -q "elaborate it in 40-100 words" "$work/err" && grep -q "needs 2-3 common mistakes" "$work/err"; then pass "analogy titles, no code, full real-world sections and 2-3 mistakes are enforced"; else fail "analogy titles, no code, full real-world sections and 2-3 mistakes are enforced"; fi
vids="$work/vids.json"
node -e 'const l=require(process.argv[1]); l.videos=[{concept_id:"retries",title:"T",channel:"C",url:"https://www.youtube.com/watch?v=abcdefghijk",start:"1:00",why:"w"},{concept_id:"retries",title:"T",channel:"C",url:"https://www.youtube.com/watch?v=abcdefghijk&t=95s",start:"1:30",why:"w"},{concept_id:"retries",title:"T",channel:"C",url:"https://www.youtube.com/watch?v=abcdefghijk&t=272s",start:"4:32",why:"Shows backoff in action."}]; l.concepts[0].fun_fact="word ".repeat(60); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$vids"
if node "$skill/scripts/validate.mjs" "$vids" "$skill/examples/sample.concept-map.json" 2>"$work/err"; then fail "bad videos passed"; fi
if grep -q 'videos\[0\].url must start at the right moment' "$work/err" && grep -q 'videos\[1\].start "1:30" must match t=95' "$work/err" && ! grep -q 'videos\[2\]' "$work/err" && grep -q "fun_fact must be at most 50" "$work/err"; then pass "video links must open at a timestamp that matches; fun facts stay short"; else fail "video links must open at a timestamp that matches; fun facts stay short"; fi

if grep -q "check-videos.mjs" "$skill/SKILL.md" && grep -q "oembed" "$skill/scripts/check-videos.mjs"; then pass "videos are checked against YouTube before building"; else fail "videos are checked against YouTube before building"; fi

if grep -q 'window.open(url.href, "_blank")' "$skill/assets/app.js" && grep -q 'window.open(url.href, "_blank")' "$skill/assets/library.html" && grep -q 'window.open(url.href, "_blank")' "$skill/playground/page.html" && grep -q "flex-direction: column" "$skill/assets/base.css"; then pass "external links open in a new tab; section labels sit above titles"; else fail "external links open in a new tab; section labels sit above titles"; fi

four="$work/four.json"; five="$work/five.json"
node -e 'const l=require(process.argv[1]); const c=JSON.parse(JSON.stringify(l.concepts[0])); c.id="queues"; c.name="Queues and background jobs"; c.explain=c.explain.replace(/\*\*Retries with backoff\*\*/,"**Queues and background jobs**"); delete c.in_your_work; l.concepts.push(c); console.log(JSON.stringify(l))' "$skill/examples/sample.lesson.json" > "$four"
node -e 'const l=require(process.argv[1]); const c=JSON.parse(JSON.stringify(l.concepts[3])); c.id="caching"; c.name="Caching"; c.explain=c.explain.replace(/\*\*Queues and background jobs\*\*/,"**Caching**"); l.concepts.push(c); console.log(JSON.stringify(l))' "$four" > "$five"
node "$skill/scripts/validate.mjs" "$four" "$skill/examples/sample.concept-map.json" 2>"$work/err4" >/dev/null || true; node "$skill/scripts/validate.mjs" "$five" "$skill/examples/sample.concept-map.json" 2>"$work/err5" >/dev/null || true
if ! grep -q "needs 2-4 concepts" "$work/err4" && grep -q "needs 2-4 concepts" "$work/err5"; then pass "lessons allow up to 4 concepts, not 5"; else fail "lessons allow up to 4 concepts, not 5"; fi

guess="$work/guess-map.json"
node -e 'const m=require(process.argv[1]); m.evidence=m.evidence.filter(e=>e.kind!=="chat"); m.concepts.forEach(c=>{ if(c.in_your_work) c.in_your_work.evidence_ids=c.in_your_work.evidence_ids.filter(id=>m.evidence.some(e=>e.id===id)); }); console.log(JSON.stringify(m))' "$skill/examples/sample.concept-map.json" > "$guess"
if node "$skill/scripts/validate.mjs" "$skill/examples/sample.lesson.json" "$guess" 2>"$work/err"; then fail "in-your-work without chat evidence passed"; fi
if node "$skill/scripts/validate.mjs" "$skill/examples/sample.lesson.json" 2>"$work/err2"; then fail "in-your-work without a concept map passed"; fi
if grep -q 'must cite at least one "chat" evidence' "$work/err" && grep -q "needs a concept map" "$work/err2"; then pass "in-your-work only comes from this session's chat, never guessed"; else fail "in-your-work only comes from this session's chat, never guessed"; fi

if ! grep -q "share-canvas\|Concept <span" "$skill/assets/app.js"; then pass "no share image and no Concept label"; else fail "no share image and no Concept label"; fi

echo "build"
export TEACH_HOME="$work/home with space"
lesson="$TEACH_HOME/lessons/2026-01-01-sample"
mkdir -p "$lesson"
node -e 'const l=require(process.argv[1]); l.hook += " </script><b>not html</b>"; console.log(JSON.stringify(l, null, 2))' "$skill/examples/sample.lesson.json" > "$lesson/lesson.json"
sh "$skill/scripts/build.sh" "$lesson" > "$work/build.out"
if [ -f "$lesson/index.html" ]; then pass "lesson page written"; else fail "lesson page written"; fi
grep -q "@@" "$lesson/index.html" && fail "placeholder left in lesson page"
if [ "$(grep -ci '</script' "$lesson/index.html")" -eq 3 ]; then pass "lesson data cannot close its script tag"; else fail "lesson data cannot close its script tag"; fi
if grep -q "Built using GrowthX" "$lesson/index.html"; then pass "watermark present"; else fail "watermark present"; fi
if grep -q 'id="sidebar"' "$lesson/index.html" && grep -q "^\.layout" "$lesson/index.html"; then pass "sidebar and layout styles inlined"; else fail "sidebar and layout styles inlined"; fi
if grep -q "^LESSON_URL=file://.*home%20with%20space/lessons/2026-01-01-sample/index.html$" "$work/build.out" && grep -q "^OPENED=no$" "$work/build.out"; then pass "build prints a clickable link and only opens with --open"; else fail "build prints a clickable link and only opens with --open"; fi

url=$(sh "$skill/scripts/serve.sh" "$lesson")
port=$(printf '%s' "$url" | sed -E 's|http://localhost:([0-9]+).*|\1|')
if curl -s -m 3 "$url" | grep -q "Built using GrowthX"; then pass "serve.sh serves the lesson on localhost"; else fail "serve.sh serves the lesson on localhost"; fi
pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
[ -n "$pids" ] && kill $pids 2>/dev/null || true
if grep -q "2026-01-01-sample/library-entry.js" "$TEACH_HOME/index.html"; then pass "library lists the lesson"; else fail "library lists the lesson"; fi
if grep -q '"Reliability and speed"' "$TEACH_HOME/index.html" && grep -q '"Reliability and speed"' "$lesson/index.html"; then pass "catalogue inlined for area names"; else fail "catalogue inlined for area names"; fi
if [ -f "$TEACH_HOME/theme.css" ]; then pass "theme.css created on first build"; else fail "theme.css created on first build"; fi

echo "playground"
pg_home="$work/pg home"
PGPORT=8759
TEACH_HOME="$pg_home" node "$skill/playground/server.mjs" --port $PGPORT --home "$pg_home" > "$work/pg.log" 2>&1 &
pg_pid=$!
i=0; while [ $i -lt 30 ] && ! grep -q PLAYGROUND_URL "$work/pg.log"; do sleep 0.2; i=$((i+1)); done
pg_url=$(sed -n 's/^PLAYGROUND_URL=//p' "$work/pg.log")
pg_token=$(printf '%s' "$pg_url" | sed 's/.*t=//')
if curl -s "http://localhost:$PGPORT/" | grep -q "Turn any AI chat into a"; then pass "playground page loads"; else fail "playground page loads"; fi
code_none=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "http://localhost:$PGPORT/api/jobs")
code_origin=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Origin: https://evil.example" -H "X-Teach-Token: $pg_token" -H "Content-Type: application/json" -d '{}' "http://localhost:$PGPORT/api/jobs")
code_short=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-Teach-Token: $pg_token" -H "Content-Type: application/json" -d '{"transcript":"hi"}' "http://localhost:$PGPORT/api/jobs")
if [ "$code_none" = 403 ] && [ "$code_origin" = 403 ] && [ "$code_short" = 400 ]; then pass "playground refuses requests without its key, from other sites, or with no real transcript"; else fail "playground refuses requests without its key, from other sites, or with no real transcript ($code_none $code_origin $code_short)"; fi
if [ "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PGPORT/lessons/x/brief.md")" = 404 ] && [ "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PGPORT/profile.json")" = 404 ]; then pass "playground never serves briefs or the profile"; else fail "playground never serves briefs or the profile"; fi
kill $pg_pid 2>/dev/null || true

echo "first-run setup"
fresh="$work/fresh"
TEACH_HOME="$fresh" sh "$skill/scripts/setup.sh" >/dev/null
if [ -f "$fresh/theme.css" ] && [ -f "$fresh/profile.json" ] && [ -d "$fresh/lessons" ]; then pass "setup creates the teach folder"; else fail "setup creates the teach folder"; fi
echo "/* mine */" >> "$fresh/theme.css"
printf '{"version":1,"lens":"tech"}\n' > "$fresh/profile.json"
TEACH_HOME="$fresh" sh "$skill/scripts/setup.sh" >/dev/null
if grep -q "mine" "$fresh/theme.css" && grep -q '"tech"' "$fresh/profile.json"; then pass "setup never overwrites theme or profile"; else fail "setup never overwrites theme or profile"; fi

echo "plugin"
if command -v claude >/dev/null 2>&1; then
  if claude plugin validate "$root" >/dev/null 2>&1 && claude plugin validate "$root/.claude-plugin/plugin.json" >/dev/null 2>&1; then pass "plugin and marketplace manifests are valid"; else fail "plugin and marketplace manifests are valid"; fi
else
  printf '  · skipped: claude CLI not found\n'
fi

echo "install"
fake_home="$work/fake-home"
mkdir -p "$fake_home/.claude" "$fake_home/.codex"
HOME="$fake_home" TEACH_HOME="$fake_home/growthx-teach" sh "$root/install.sh" >/dev/null
if [ -f "$fake_home/.claude/skills/teach/SKILL.md" ]; then pass "installed for Claude Code"; else fail "installed for Claude Code"; fi
if [ -f "$fake_home/.agents/skills/teach/SKILL.md" ]; then pass "installed for Codex"; else fail "installed for Codex"; fi
if [ -f "$fake_home/growthx-teach/theme.css" ] && [ -f "$fake_home/growthx-teach/profile.json" ]; then pass "teach folder set up"; else fail "teach folder set up"; fi
echo "/* mine */" >> "$fake_home/growthx-teach/theme.css"
HOME="$fake_home" TEACH_HOME="$fake_home/growthx-teach" sh "$root/install.sh" >/dev/null
if grep -q "mine" "$fake_home/growthx-teach/theme.css" && [ -f "$fake_home/growthx-teach/theme.default.css" ]; then pass "reinstall keeps a customised theme"; else fail "reinstall keeps a customised theme"; fi
HOME="$fake_home" sh "$root/uninstall.sh" >/dev/null
if [ ! -e "$fake_home/.claude/skills/teach" ] && [ ! -e "$fake_home/.agents/skills/teach" ] && [ -d "$fake_home/growthx-teach/lessons" ]; then pass "uninstall removes the skill, keeps lessons"; else fail "uninstall removes the skill, keeps lessons"; fi

echo "all passed"
