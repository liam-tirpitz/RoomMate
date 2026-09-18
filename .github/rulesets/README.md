# Repository rulesets

These files define the branch and tag protection for this repository. **GitHub does not read them from here.** Unlike `.github/workflows/`, this folder has no special meaning: changing a file has no effect until the ruleset is applied again, and changes made in the GitHub UI don't show up here.

Treat these files as the source of truth. Change the file first, then apply it; don't edit rulesets in the UI.

| File | Protects | Summary |
|------|----------|---------|
| `development.json` | `development` | No deletion or force push. Changes only through pull requests, merged by merge commit or squash. CI must pass. |
| `main.json` | `main` | Same as `development`, but merge commits only. |
| `release-tags.json` | `v*` tags | Tags can be created (by the release workflow) but not moved or deleted. |

Why the rules look the way they do:
- **Merge commits only on `main`:** semantic-release builds the release notes from the individual commits. Squashing `development` into `main` would turn a whole release into a single commit.
- **Conventional PR titles when squashing into `development`:** the squashed commit takes the PR title, and semantic-release only releases `fix(...)` and `feat(...)` commits.
- **No approvals required:** with a single maintainer, nobody else could approve. Raise `required_approving_review_count` when more people contribute.
- **Admin bypass only through pull requests:** admins can merge a pull request whose checks fail, but can never push directly to `main` or `development`.

## Required checks

The required status checks must match the job names in [`../workflows/ci.yml`](../workflows/ci.yml):
- `Server tests and type check`
- `Firmware build (feather)`
- `Firmware build (poe)`

If you rename a job or add a firmware environment, update `development.json` and `main.json` in the same pull request and re-apply them. Otherwise pull requests wait forever for a check that no longer exists. The checks are pinned to the GitHub Actions app (`integration_id` 15368), so no other app can report them.

## Applying the rulesets

This needs admin rights on the repository and the [GitHub CLI](https://cli.github.com/). Run from the repository root.

Create them the first time:

```sh
for file in .github/rulesets/*.json; do
  gh api -X POST repos/liam-tirpitz/RoomMate/rulesets --input "$file"
done
```

Update an existing ruleset after changing its file. Look up its ID first:

```sh
gh api repos/liam-tirpitz/RoomMate/rulesets --jq '.[] | "\(.id)  \(.name)"'
gh api -X PUT repos/liam-tirpitz/RoomMate/rulesets/<id> --input .github/rulesets/main.json
```

`POST` only creates new rulesets and never replaces an existing one, so use `PUT` for updates.

You can also import a file under **Settings → Rules → Rulesets → New ruleset → Import a ruleset**.

To see what is currently active, compare the output of `gh api repos/liam-tirpitz/RoomMate/rulesets/<id>` with the file. GitHub adds fields such as `id`, `source` and `_links`, and may fill in default parameters, so expect some differences besides the rules themselves.
