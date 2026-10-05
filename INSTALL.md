# Install GrowthX teach

These steps are written for an AI coding agent (Claude Code, Codex, or similar) installing teach on the user's behalf. People can follow them too.

Work through the steps in order. Give the user one short line per step. Do not change anything on the machine beyond what these steps describe.

## 1. Get the files

If you are reading this file from a local clone of `GrowthX-Club/teach`, use that clone and skip to step 2.

Otherwise make a temporary folder and clone the repo into it:

```sh
git clone --depth 1 https://github.com/GrowthX-Club/teach.git <tmp>/teach
```

If that fails because the repo is private, try the GitHub CLI, which uses the user's GitHub login:

```sh
gh repo clone GrowthX-Club/teach <tmp>/teach -- --depth 1
```

If `gh` is not installed or not signed in, try SSH:

```sh
git clone --depth 1 git@github.com:GrowthX-Club/teach.git <tmp>/teach
```

If all three fail, stop and tell the user they need access to `github.com/GrowthX-Club/teach` (or need to sign in with `gh auth login`).

## 2. Install

Run the installer from the clone:

```sh
sh <clone>/install.sh
```

It installs the skill for every agent it finds and sets up the user's teach folder. On Windows, run it in Git Bash or WSL (Claude Code on Windows already runs commands through Git Bash).

If you cannot run shell scripts, do the same by hand with your file tools:

1. Copy the folder `<clone>/skills/teach` to:
   - Claude Code: `~/.claude/skills/teach`
   - Codex: `~/.agents/skills/teach`

   Install for the agent you are running in. Also install for the other one if its folder (`~/.claude` or `~/.codex`) exists. Replace an existing `teach` folder only if its `SKILL.md` starts with `name: teach`; otherwise ask the user first.
2. Create `~/growthx-teach/lessons/`.
3. If `~/growthx-teach/theme.css` does not exist, copy `<clone>/skills/teach/assets/theme.css` there. Never overwrite an existing one; the user may have customised it.
4. If `~/growthx-teach/profile.json` does not exist, create it with:

   ```json
   {
     "version": 1,
     "lens": "balanced",
     "domains": {},
     "notes": [],
     "history": []
   }
   ```

## 3. Check it worked

- `SKILL.md` exists in each folder you installed to, and its front matter says `name: teach`.
- `~/growthx-teach/theme.css` and `~/growthx-teach/profile.json` exist.
- Run `node --version`. If Node.js is missing, tell the user lessons will still work but will skip validation.

## 4. Finish

- Delete the temporary clone if you made one.
- Tell the user, in two lines at most, which agents teach was installed for, and: "Start a new chat (or restart the app), then type `teach` after building or discussing something, or `teach <topic>` to learn a topic."

## Updating

Follow these same steps again. The installer replaces the skill and keeps the user's lessons, profile and theme.

## Uninstalling

Run `sh <clone>/uninstall.sh`, or delete `~/.claude/skills/teach` and `~/.agents/skills/teach`. Never delete `~/growthx-teach/` unless the user asks; it holds their lessons.
