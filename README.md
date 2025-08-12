# NPM Pull Request Action

![version](https://img.shields.io/badge/version-2.1-blue)
![type](https://img.shields.io/badge/type-Composite%20Action-2ea44f) ![node](<https://img.shields.io/badge/Node-22.x%20(default)-informational>)
![prettier](https://img.shields.io/badge/Prettier-optional-success) ![eslint](https://img.shields.io/badge/ESLint-optional-success) ![jest](https://img.shields.io/badge/Jest-optional-success) ![snyk](https://img.shields.io/badge/Snyk-optional-success)
[![](https://img.shields.io/static/v1?label=MEBlabs&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/meblabs)

**GitHub Action for MEBlabs pull requests in npm projects.**
It can (optionally) format your code with Prettier, review ESLint findings on the PR, run Jest tests and publish a report, run a Snyk security scan (with SARIF comment on failure), and auto-merge bot PRs with safety checks.

---

## What this action does (at a glance)

1. **Checkout & Node setup** (if enabled)
2. **Install dependencies** (`npm ci`)
3. **Prettier** (optional)

   - Runs your `format` script
   - Auto-commits and pushes if there are changes (using the configured bot identity)

4. **ESLint** (optional)

   - Uses `reviewdog` to comment findings directly on the PR

5. **Jest** (optional)

   - Runs tests (non-blocking)
   - Publishes a PR report (even if tests fail)

6. **Security (Snyk)** (optional)

   - Runs Snyk Code test with `--sarif-file-output`
   - Posts a SARIF summary comment **only if the Snyk step fails**
   - **Runs only if PR author ≠ `bot_name`**

7. **Auto-merge** (optional)

   - **Runs only if PR author = `bot_name` and the branch is allowed**
   - Merges PRs that have exactly **one commit**
   - Skips auto-merge if the PR updates a **pinned dependency** (semver string in `package.json` dependencies)
   - Deletes the source branch after merge **unless** it’s in `protected-branches`

---

## Requirements in your repository

- Commit your `package-lock.json` (don’t ignore it).
- Add a `format` script to `package.json` if you enable Prettier:

  ```json
  {
    "scripts": {
      "format": "prettier --write \"**/*.{json,js,yml,md}\""
    }
  }
  ```

---

## Inputs

| Name                      | Type         |               Default | Description                                                                                                                  |
| ------------------------- | ------------ | --------------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| `prettier`                | boolean      |                `true` | Run your `npm run format` and auto-commit any changes.                                                                       |
| `eslint`                  | boolean      |                `true` | Run ESLint via `reviewdog/action-eslint@v1` and comment on the PR.                                                           |
| `test`                    | boolean      |                `true` | Run Jest and publish a PR report (non-blocking).                                                                             |
| `token`                   | string       |                     — | **PAT** (recommended) used by reviewdog to comment and by the auto-merge step as `GH_TOKEN`. Needs `repo` scope for merging. |
| `github-token`            | string       |                     — | `GITHUB_TOKEN` (or PAT) used for checkout push, Jest report comment, and SARIF comment.                                      |
| `test-script`             | string       |                `test` | Custom npm script for tests (e.g. `test:ci`).                                                                                |
| `working-directory`       | string       |                     — | Working directory used **by the auto-merge step** context. (npm tasks run at repo root in v3.)                               |
| `checkout`                | boolean      |                `true` | Perform `actions/checkout` inside the action. Disable if your workflow already checks out.                                   |
| `node-version`            | string       |                `22.x` | Node version (e.g. `20.x`, `22.x`).                                                                                          |
| `enable-security`         | boolean      |                `true` | Enable Snyk code scan and SARIF PR comment on failure.                                                                       |
| `bot_name`                | string       |          `MeblabsBot` | Bot username. Security runs only if PR author ≠ this; auto-merge runs only if PR author = this.                              |
| `bot_email`               | string       |  `github@meblabs.com` | Bot email used for Prettier auto-commits.                                                                                    |
| `snyk-token`              | string       |                     — | `SNYK_TOKEN` for Snyk. Required if `enable-security: true`.                                                                  |
| `snyk-org`                | string       |                     — | Snyk org slug for your project.                                                                                              |
| `enable-auto-merge`       | boolean      |                `true` | Enable auto-merge logic for bot PRs.                                                                                         |
| `protected-branches`      | string (CSV) | `dev,staging,release` | Branches **not** deleted after merge. Comma-separated; spaces are trimmed; exact, case-sensitive match.                      |
| `allowed-branches`        | string (CSV) |                 `dev` | Branches **allowed** for auto-merge. Comma-separated; spaces are trimmed; exact, case-sensitive match.                       |
| `snyk-severity-threshold` | string       |                `high` | Passed to Snyk as `--severity-threshold`. Typical values: `low` \| `medium` \| `high` \| `critical`.                         |

> **Note:** In v3.0 the npm steps (install/format/eslint/test) always run at the repo root. `working-directory` currently applies only to the auto-merge step context.

---

## Required job permissions

Set permissions on the job that uses this action:

- Always:

  - `checks: write`
  - `pull-requests: write`
  - `contents: write`

- If you enable security:

  - `security-events: write`
  - `issues: write`
  - `actions: write` (to allow tools used during reporting)

---

## Tokens & secrets (who does what)

| Purpose                                   | Input/Env                   | Recommended value                                                                               |
| ----------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| PR review comments (ESLint via reviewdog) | `token`                     | **PAT** (so you can also reuse it for `GH_TOKEN` in auto-merge)                                 |
| Checkout/push & PR comments (Jest/SARIF)  | `github-token`              | `${{ secrets.GITHUB_TOKEN }}` or PAT                                                            |
| Auto-merge (GitHub CLI)                   | `GH_TOKEN` = `inputs.token` | **PAT with `repo` scope** (recommended; `GITHUB_TOKEN` may not be sufficient for `gh pr merge`) |
| Snyk auth                                 | `snyk-token`                | `${{ secrets.SNYK_TOKEN }}`                                                                     |
| Snyk org                                  | `snyk-org`                  | Your Snyk org slug                                                                              |

---

## Usage

### Minimal (lint + test, no security, no auto-merge)

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging, dev]

jobs:
  pr:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
    steps:
      - name: NPM Pull Request
        uses: meblabs/npm-pull-request-action@v3.0
        with:
          token: ${{ secrets.MEBBOT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          node-version: 22.x
          enable-security: false
          enable-auto-merge: false
```

### With Snyk security scan

```yml
jobs:
  pr:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
      security-events: write
      issues: write
      actions: write
    steps:
      - name: NPM Pull Request (with Snyk)
        uses: meblabs/npm-pull-request-action@v3.0
        with:
          token: ${{ secrets.MEBBOT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          enable-security: true
          snyk-token: ${{ secrets.SNYK_TOKEN }}
          snyk-org: ${{ secrets.SNYK_ORG }}
          snyk-severity-threshold: high
```

> **Security behavior:** The Snyk job runs **only if the PR author is not** `bot_name`. On Snyk failure, a SARIF summary comment is posted on the PR.

### With auto-merge for bot PRs

```yml
jobs:
  pr:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
    steps:
      - name: NPM Pull Request (auto-merge)
        uses: meblabs/npm-pull-request-action@v3.0
        with:
          token: ${{ secrets.MEBBOT }} # PAT with repo scope (used as GH_TOKEN)
          github-token: ${{ secrets.GITHUB_TOKEN }}
          enable-auto-merge: true
          bot_name: MeblabsBot
          bot_email: github@meblabs.com
          protected-branches: "dev, staging, release" # CSV, spaces ok
```

> **Auto-merge behavior:**
>
> - Triggers only if PR author **equals** `bot_name`.
> - Requires **exactly one commit** in the PR.
> - Skips auto-merge if the single commit appears to update a **pinned dependency** from `package.json` (dependency specified as a strict semver).
> - After merging, deletes the source branch **unless** it is listed in `protected-branches`.

### Full example (setup keys + everything)

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging, dev]

jobs:
  pr:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
      security-events: write
      issues: write
      actions: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: ${{ github.event.pull_request.head.ref }}

      - name: Setup keys
        env:
          FontAwesomeKey: ${{ secrets.FONT_AWESOME_KEY }}
        run: sed "s/__FontAwesomeKey__/${FontAwesomeKey}/g" .npmrc.template > .npmrc

      - name: NPM Pull Request (lint/test/security/auto-merge)
        uses: meblabs/npm-pull-request-action@v3.0
        with:
          checkout: false
          node-version: 22.x
          token: ${{ secrets.MEBBOT }} # PAT used for reviewdog + gh merge
          github-token: ${{ secrets.GITHUB_TOKEN }} # PR comments & checkout push
          prettier: true
          eslint: true
          test: true
          enable-security: true
          snyk-token: ${{ secrets.SNYK_TOKEN }}
          snyk-org: ${{ secrets.SNYK_ORG }}
          snyk-severity-threshold: high
          enable-auto-merge: true
          bot_name: MeblabsBot
          bot_email: github@meblabs.com
          protected-branches: "dev, staging, release"
          allowed-branches: "dev"
```

---

## Detailed behavior & logic

### Prettier

- Runs if `prettier: true`.
- If there are changes, commits with:

  - `user.name = bot_name`
  - `user.email = bot_email`
  - message: `chore: code formatted with prettier [skip ci]`

- Pushes back to the PR branch.

### ESLint (reviewdog)

- Runs if `eslint: true`.
- Uses `reviewdog/action-eslint@v1` with flags: `. --ext .js`.
  _(If you lint TS too, set up ESLint accordingly in your repo.)_
- Uses `token` to post PR review comments.

### Jest

- Runs if `test: true` with:

  ```
  npm run <test-script> -- --ci --json --outputFile=jest-results.json
  ```

- Always publishes a PR report (even on failure) with `im-open/process-jest-test-results@v2`.

### Security (Snyk)

- Runs if `enable-security: true` **and** PR author ≠ `bot_name`.
- Uses `snyk/actions/node@master` with:

  - `--sarif-file-output=snyk.sarif`
  - `--org=<snyk-org>`
  - `--severity-threshold=<snyk-severity-threshold>`

- If the Snyk step fails, posts a **SARIF summary comment** on the PR.

### Auto-merge (GitHub CLI)

- Runs if `enable-auto-merge: true` **and** PR author = `bot_name`.
- Requires **one commit** only; otherwise, exits without merging.
- Reads `package.json` and if the commit message looks like:

  ```
  fix: upgrade <dep> from 1.2.0 to 1.3.0
  ```

  and `<dep>` is **pinned** (strict semver) in `dependencies`, auto-merge is **skipped**.

- Merges with `--auto --merge`.
- Branch deletion:

  - **Not deleted** if the head ref is in `protected-branches` (CSV, trimmed, exact match).
  - Deleted otherwise (`--delete-branch`).

---

## Troubleshooting / FAQ

**Auto-merge didn’t run. Why?**
Check all of the following:

- `enable-auto-merge: true`
- PR author equals `bot_name`
- PR has **exactly one commit**
- The commit is **not** updating a pinned dependency listed in `package.json`
- `token` is a **PAT with `repo` scope** (used as `GH_TOKEN` by `gh pr merge`)

**No SARIF comment from Snyk.**

- Ensure `enable-security: true` and the PR author is **not** `bot_name`.
- The comment is posted **only if the Snyk step fails**.
- Ensure job permissions include `security-events: write`, `issues: write`, `actions: write`.
- Ensure `snyk-token` and `snyk-org` are set.

**I already checkout earlier in the workflow.**

- Set `checkout: false` in the action inputs.

**Custom monorepo folder?**

- In v3.0, npm steps run at the repo root. `working-directory` currently applies only to the auto-merge step context.

---

## Changelog

### v3.0

- Added **Security** (Snyk) and **Auto-merge** features with input flags
- Bot-aware execution: security runs only for non-bot PRs; auto-merge runs only for bot PRs
- SARIF PR comment on Snyk failure
- Protected branches handled as **CSV with trimming**
- Configurable bot identity (`bot_name`, `bot_email`)
- Snyk severity threshold input
- Single-commit and pinned-dependency safeguards for auto-merge
