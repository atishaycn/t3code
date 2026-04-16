# Fork Sync + DMG Build Runbook

This runbook updates the source repo state, brings the current fork up to date without losing fork-specific work, validates the project, pushes the result, and builds a new macOS DMG.

## Repo assumptions

- **Current repo**: `/Users/suns/Developer/t3code`
- **Fork remote**: `origin` → `git@github.com:atishaycn/t3code.git`
- **Source remote**: `upstream` → `git@github.com:pingdotgg/t3code.git`
- **Main branch**: replace `main` below if the source branch is different
- **DMG build host**: must be run on macOS

## Goal

1. Update the source repo state from git.
2. Sync the forked local project with source changes **without breaking newer fork work**.
3. Validate the codebase.
4. Commit and push the merged result.
5. Build a new DMG.

---

## 0. Preflight

Run from the repo root:

```bash
cd /Users/suns/Developer/t3code
pwd
git status --short
git remote -v
```

If there are local uncommitted changes, commit them:

```bash
git stash push -u -m "pre-sync stash"
```

---

## 1. Fetch the latest source and fork history

```bash
git fetch origin --prune
git fetch upstream --prune
```

Inspect divergence before changing anything:

```bash
git log --oneline --graph --decorate --max-count=20 --all
git log --oneline HEAD..upstream/main
git log --oneline upstream/main..HEAD
```

What these mean:

- `HEAD..upstream/main` = commits available from source that are not in the current branch yet
- `upstream/main..HEAD` = local/fork commits that must be preserved

---

## 2. Create a safety branch before syncing

```bash
git switch -c chore/sync-upstream-$(date +%Y%m%d-%H%M%S)
```

This keeps the sync work isolated and easy to roll back.

---

## 3. Merge upstream into the fork branch

Use a **merge**, not a hard reset, so newer fork-specific work is preserved.

```bash
git merge --no-ff upstream/main
```

If there are conflicts:

1. Resolve each conflicted file carefully.
2. Prefer preserving fork-specific features unless upstream contains the intentional replacement.
3. After resolving:

```bash
git add <resolved-files>
git commit
```

Useful conflict review commands:

```bash
git status
git diff --name-only --diff-filter=U
git diff
```

---

## 4. Validate that nothing new was broken

Required repo checks:

```bash
bun fmt
bun lint
bun typecheck
```

If dependency lockfiles or generated files changed in expected ways, include them in the commit.

Optional but helpful before release build:

```bash
bun run test
```

> Repo note: never run `bun test`; use `bun run test` if tests are needed.

---

## 5. Review exactly what will be committed

```bash
git status
git diff --stat
git diff origin/$(git branch --show-current)...HEAD
```

If the result looks correct, stage everything intended for the sync:

```bash
git add -A
```

Commit with a clear message:

```bash
git commit -m "chore: sync fork with upstream and prepare dmg build"
```

---

## 6. Push the synced branch

Push the current branch to the fork remote:

```bash
git push -u origin HEAD
```

If this work must land on a specific branch instead:

```bash
git push origin HEAD:<target-branch>
```

---

## 7. Build the new DMG

### Preferred one-command path

This repo already includes an automated script that:

- bumps the desktop version
- pushes the current branch
- builds the DMG

Run:

```bash
bun run push:dmg
```

Useful variants:

```bash
bun run push:dmg -- --dry-run
bun run push:dmg -- --arch arm64
bun run push:dmg -- --signed
bun run push:dmg -- --verbose
```

### Manual DMG build path

If you already pushed manually and only want the artifact build:

```bash
bun run dist:desktop:dmg
```

Or architecture-specific:

```bash
bun run dist:desktop:dmg:arm64
bun run dist:desktop:dmg:x64
```

Artifacts are written under:

```text
release/
```

---

## 8. Post-build verification

Confirm the new artifact exists:

```bash
ls -lh release/*.dmg
```

Optional smoke check:

```bash
bun run release:smoke
```

If signing/notarization is part of your release flow, verify those outputs too.

---

## 9. If you stashed changes earlier

Restore them only after the sync/build is complete:

```bash
git stash list
git stash pop
```

Resolve any follow-up conflicts carefully.

---

## Recommended shortest safe sequence

If everything is clean and you want the condensed flow:

```bash
cd /Users/suns/Developer/t3code
git fetch origin --prune
git fetch upstream --prune
git switch -c chore/sync-upstream-$(date +%Y%m%d-%H%M%S)
git merge --no-ff upstream/main
bun fmt
bun lint
bun typecheck
git add -A
git commit -m "chore: sync fork with upstream"
git push -u origin HEAD
bun run push:dmg
```

## Notes

- Do **not** use `git reset --hard upstream/main` for this workflow; that risks dropping fork-specific work.
- Prefer merging upstream first, then fixing any integration issues locally.
- `bun run push:dmg` already performs a push and version bump before building, so avoid surprise extra commits by running it only after the sync branch is clean and ready.
