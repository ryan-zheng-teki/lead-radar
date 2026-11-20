# Release Guide

How a verified change in Lead Radar is finalized and published. Read it before
merging a ticket into `main` or pushing.

## Finalization Target

- Remote `origin` = `https://github.com/ryan-zheng-teki/lead-radar.git` (public), branch `main`.
- Ticket branches are named `ticket/<ticket-name>`, in their own worktree.
- Merge method: fast-forward `main` to the verified ticket branch (`git merge --ff-only ticket/<ticket-name>`), then `git push origin main`. Only `main` is pushed; ticket branches stay local.
- Never commit: `.env` or any key value, `runs/`, `node_modules/`, browser profiles. `.gitignore` covers `.env`, `.env.*` (except `.env.example`), `node_modules/` and `runs/`.
- File names must check out on Linux, macOS and Windows: no `: * ? " < > |` or backslash, no two paths that differ only in case.

## Release Decision

The user decides. The default is no release: a verified ticket is pushed to
`main`, and people run it from a clone. There are no tags, packages or hosted
deployments.

## Checks Before Pushing

Run on the merged state, from the repository root:

- Secret scan, which must print nothing: `git grep -nE "tvly-[A-Za-z0-9]{10,}|v1\.Cm"`. Also count each real key value with `git grep -c -F -- "$KEY"`, loading it into a shell variable without echoing it. The count must be 0.
- File names: `git ls-files | grep -nE '[:*?"<>|\\]'` must print nothing, and `git ls-files | tr A-Z a-z | sort | uniq -d` must print nothing.

## Cutting The Release

Not applicable: nothing is versioned. `package.json` stays at `0.1.0` until the user asks for a versioned release.

## Watching The Rollout

There is no pipeline. After the push, check that `git ls-remote origin main` equals the local `main` commit, and that the GitHub page shows the README.

## Recovery

If the push is rejected because `origin/main` has moved, fetch, bring the ticket branch up to date, rerun the checks in `TESTING.md` that the change needs, then fast-forward and push again. Never force-push `main`.

## Rollback

`git revert <commit>` on `main` and push. If a key was ever pushed, revoking that key at Nebius or Tavily is the fix. Rewriting history does not remove a key that was public.

## Deployment

No hosted service. Users clone the repo, copy `.env.example` to `.env`, add their own keys and run `npm start` (README "Try it").
