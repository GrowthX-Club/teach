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

echo "build"
export TEACH_HOME="$work/home with space"
lesson="$TEACH_HOME/lessons/2026-01-01-sample"
mkdir -p "$lesson"
node -e 'const l=require(process.argv[1]); l.hook += " </script><b>not html</b>"; console.log(JSON.stringify(l, null, 2))' "$skill/examples/sample.lesson.json" > "$lesson/lesson.json"
sh "$skill/scripts/build.sh" "$lesson" >/dev/null
if [ -f "$lesson/index.html" ]; then pass "lesson page written"; else fail "lesson page written"; fi
grep -q "@@" "$lesson/index.html" && fail "placeholder left in lesson page"
if [ "$(grep -ci '</script' "$lesson/index.html")" -eq 2 ]; then pass "lesson data cannot close its script tag"; else fail "lesson data cannot close its script tag"; fi
if grep -q "Built using GrowthX" "$lesson/index.html"; then pass "watermark present"; else fail "watermark present"; fi
if grep -q "2026-01-01-sample/library-entry.js" "$TEACH_HOME/index.html"; then pass "library lists the lesson"; else fail "library lists the lesson"; fi
if [ -f "$TEACH_HOME/theme.css" ]; then pass "theme.css created on first build"; else fail "theme.css created on first build"; fi

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
