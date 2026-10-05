# Install GrowthX teach

These steps are written for an AI coding agent (Claude Code, Codex, or similar) installing teach on the user's behalf. People can follow them too.

Work through the steps in order. Give the user one short line per step. Do not change anything on the machine beyond what these steps describe.

teach creates its own folder (`~/growthx-teach/`) the first time it runs, so installing is only about getting the skill into the agent.

## 1. Claude Code: install the plugin

If you are Claude Code, install teach as a plugin. Plugins update themselves.

```sh
claude plugin marketplace add GrowthX-Club/teach
claude plugin install teach@growthx
```

If adding the marketplace fails because the repo is private, retry with the SSH URL, which uses the user's GitHub SSH key:

```sh
claude plugin marketplace add git@github.com:GrowthX-Club/teach.git
claude plugin install teach@growthx
```

If an older copy exists at `~/.claude/skills/teach` and its `SKILL.md` front matter says `name: teach`, delete that folder so there are not two teach skills.

If both attempts fail, go to step 3.

## 2. Codex and other agents: use the skills CLI

If you are Codex, or another agent that reads skills from `~/.agents/skills`, and Node.js is installed:

```sh
npx -y skills add GrowthX-Club/teach -g -y -a codex
```

Replace `-a codex` with your agent's name if you are a different agent. Do not add `claude-code` here when the plugin from step 1 is installed.

If it fails because the repo is private, retry with the SSH URL:

```sh
npx -y skills add git@github.com:GrowthX-Club/teach.git -g -y -a codex
```

If Node.js is missing or both attempts fail, go to step 3.

## 3. Fallback: clone and run the installer

Clone the repo into a temporary folder. Try these in order until one works:

```sh
git clone --depth 1 https://github.com/GrowthX-Club/teach.git <tmp>/teach
gh repo clone GrowthX-Club/teach <tmp>/teach -- --depth 1
git clone --depth 1 git@github.com:GrowthX-Club/teach.git <tmp>/teach
```

If all three fail, stop and tell the user they need access to `github.com/GrowthX-Club/teach` (or need to sign in with `gh auth login`).

Then run:

```sh
sh <tmp>/teach/install.sh
```

It copies the skill to `~/.claude/skills/teach` and/or `~/.agents/skills/teach` for each agent it finds. On Windows, run it in Git Bash or WSL. If you cannot run shell scripts, copy `<tmp>/teach/skills/teach` to those folders with your file tools instead.

Delete the temporary clone afterwards.

## 4. Check it worked

- Claude Code plugin: `claude plugin list` shows `teach@growthx` as enabled.
- Skills folder installs: `SKILL.md` exists in `~/.agents/skills/teach` or `~/.claude/skills/teach`, and its front matter says `name: teach`.
- Run `node --version`. If Node.js is missing, tell the user lessons still work but skip validation.

## 5. Finish

Tell the user, in two lines at most, which agents teach was installed for, and: "Start a new chat, then type `teach` after building or discussing something, or `teach <topic>` to learn a topic."

## Updating

| Installed with | Update with |
|---|---|
| Claude Code plugin | `claude plugin update teach@growthx` (also updates automatically) |
| skills CLI | `npx -y skills update teach -g -y` |
| installer | run step 3 again |

Updates never touch the user's lessons, profile or theme.

## Uninstalling

| Installed with | Remove with |
|---|---|
| Claude Code plugin | `claude plugin uninstall teach@growthx` |
| skills CLI | `npx -y skills remove teach -g -y` |
| installer | `sh uninstall.sh` from a clone |

Never delete `~/growthx-teach/` unless the user asks; it holds their lessons.
