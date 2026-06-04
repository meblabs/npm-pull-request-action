# NPM Pull Request Action

[![zizmor](https://github.com/meblabs/npm-pull-request-action/actions/workflows/zizmor.yml/badge.svg)](https://github.com/meblabs/npm-pull-request-action/actions/workflows/zizmor.yml)
![type](https://img.shields.io/badge/type-Composite%20Action-2ea44f)
[![](https://img.shields.io/static/v1?label=MEBlabs&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/meblabs)

**GitHub Action for MEBlabs pull requests in npm projects.**

> [!IMPORTANT]
> This action relies on `actions/checkout@v6` and `actions/setup-node@v6`, which run
> on the Node 24 runtime. Use it on `ubuntu-latest` or a self-hosted runner with agent
> `>= v2.327.1`.

This composite action manages the npm pull request quality gate for JavaScript, Node.js, React, and npm-based projects.

It can:

- check out the repository;
- configure Node.js;
- install dependencies with `npm ci`;
- format code with Prettier;
- apply controlled npm lockfile vulnerability remediations;
- create one automatic commit when Prettier and/or npm audit produce changes;
- review ESLint findings on the pull request;
- run Jest tests;
- publish a Jest report on the pull request;
- expose compact outputs that can be used by downstream jobs.

This is the quality action. It is designed to live independently and can be used alone in npm pull request workflows.

It can also work together with the separate MEBlabs Security Workflow, as described in [Integration with MEBlabs Security Workflow](#integration-with-meblabs-security-workflow).

---

## What this action does at a glance

1. **Checkout and Node setup**

   - Checks out the repository if `checkout: true`.
   - Configures Node.js using `actions/setup-node`.
   - Installs dependencies with `npm ci`.

2. **Prettier**

   - Runs your `format` script.
   - Detects whether formatting produced changes.
   - Does not commit immediately.
   - If Prettier and/or npm audit produce changes, the action creates one automatic commit near the end of the remediation phase.

3. **npm audit lockfile remediation**

   - Runs `npm audit fix --package-lock-only`.
   - Never allows automatic changes to `package.json`.
   - Detects whether `package-lock.json` changed.
   - If Prettier and/or npm audit produce changes, the action creates one automatic commit near the end of the remediation phase.

4. **Automatic commit handling**

   - If Prettier changed files, npm audit changed `package-lock.json`, or both happened, the action commits all automatic changes in a single commit.
   - The commit is pushed using the configured bot identity.
   - The commit does **not** include `[skip ci]`.
   - ESLint and Jest are skipped in the current execution so the next workflow run can validate the new commit.

5. **ESLint**

   - Uses `reviewdog/action-eslint@v1`.
   - Comments findings directly on the pull request.
   - Runs only if no automatic commit was created by Prettier or npm audit.

6. **Jest**

   - Runs tests.
   - Publishes a pull request report even if tests fail.
   - Runs only if no automatic commit was created by Prettier or npm audit.

7. **Downstream workflow coordination**

   - Exposes compact outputs for downstream workflow orchestration:
     - `prettier-changed`;
     - `audit-changed`;
     - `current-head-sha`.
   - Downstream jobs can use these outputs to decide whether they should run in the same workflow execution.
   - Downstream jobs can use `current-head-sha` as the commit reference for further validation.

---

## Execution model

This action is designed to avoid validating an obsolete commit.

If Prettier or npm audit creates an automatic commit, the current run should not continue with ESLint, tests, or other downstream validation jobs, because the checked code is no longer the final pull request head.

The intended flow is:

```text
Pull request commit
  -> quality action runs
  -> Prettier and npm audit remediation run
  -> automatic commit is created if needed
  -> workflow runs again on the new commit
  -> quality action runs again
  -> no automatic commit
  -> ESLint runs
  -> Jest runs
  -> downstream validation jobs can run on the validated commit
```

This makes the pipeline more deterministic and more suitable for audit evidence, because tests and downstream validation jobs run on the commit that is actually being reviewed.

---

## Requirements in your repository

- Commit `package.json`.
- Commit `package-lock.json`; do not ignore it.
- Keep `package.json` stable during automatic audit remediation.
- Add a `format` script to `package.json` if you enable Prettier.

Example:

```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{json,js,jsx,mjs,cjs,yml,yaml,md}\""
  }
}
```

- Add a test script if you enable Jest.

Example:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

The npm steps install, format, audit, lint, and test always run at the repository root.

---

## Inputs

| Name | Type | Default | Description |
| ---- | ---- | ------: | ----------- |
| `prettier` | boolean | `true` | Run `npm run format` and include formatting changes in the automatic commit when needed. |
| `eslint` | boolean | `true` | Run ESLint via `reviewdog/action-eslint@v1` and comment on the pull request. |
| `test` | boolean | `true` | Run Jest and publish a pull request report. |
| `test-script` | string | `test` | Custom npm script for tests, for example `test:ci`. |
| `audit` | boolean | `true` | Run `npm audit fix --package-lock-only` before tests and include `package-lock.json` changes in the automatic commit when needed. |
| `audit-level` | string | `high` | Minimum npm audit level used by `npm audit fix`: `low`, `moderate`, `high`, or `critical`. |
| `token` | string | — | PAT or `GITHUB_TOKEN` used by reviewdog to comment on the pull request. |
| `github-token` | string | — | `GITHUB_TOKEN` or PAT used for checkout, push, and Jest report comments. |
| `checkout` | boolean | `true` | Perform `actions/checkout` inside the action. Disable if your workflow already checks out. |
| `node-version` | string | `22.x` | Node version, for example `20.x` or `22.x`. |
| `bot_name` | string | `MeblabsBot` | Bot username used for automatic commits. |
| `bot_email` | string | `github@meblabs.com` | Bot email used for automatic commits. |

---

## Outputs

| Name | Description |
| ---- | ----------- |
| `prettier-changed` | `true` if Prettier changed files and an automatic commit was pushed. |
| `audit-changed` | `true` if npm audit changed `package-lock.json` and an automatic commit was pushed. |
| `current-head-sha` | Current local `HEAD` SHA at the end of the action. |

### Output behavior

| Situation | `prettier-changed` | `audit-changed` | ESLint in same run | Jest in same run | Downstream jobs in same run |
| --------- | -----------------: | --------------: | -----------------: | ---------------: | --------------------------: |
| Prettier creates changes only | `true` | `false` | no | no | no |
| npm audit creates changes only | `false` | `true` | no | no | no |
| Prettier and npm audit both create changes | `true` | `true` | no | no | no |
| No automatic changes | `false` | `false` | yes | yes | yes |

A downstream job should run only when:

```yml
needs.quality.outputs.prettier-changed != 'true' &&
needs.quality.outputs.audit-changed != 'true'
```

The commit to scan or validate is exposed as:

```yml
needs.quality.outputs.current-head-sha
```

---

## Required job permissions

Set permissions on the job that uses this action.

Minimum permissions:

```yml
permissions:
  checks: write
  pull-requests: write
  contents: write
  issues: write
```

Why these are needed:

| Permission | Used for |
| ---------- | -------- |
| `checks: write` | Jest report/check output. |
| `pull-requests: write` | Pull request review comments from reviewdog. |
| `contents: write` | Checkout and push for automatic commits. |
| `issues: write` | Pull request comments, because GitHub pull request comments use the Issues API. |

If you disable automatic commits or avoid pull request comments, you can reduce permissions in the calling workflow.

---

## Tokens and secrets

| Purpose | Input | Recommended value |
| ------- | ----- | ----------------- |
| Pull request review comments from ESLint/reviewdog | `token` | `${{ secrets.MEBBOT }}` or a bot PAT |
| Checkout, push, and Jest report comments | `github-token` | `${{ secrets.GITHUB_TOKEN }}` |

For private repositories, ensure the token used in `github-token` can push to the pull request branch when automatic commits are enabled.

---

## Usage

### Basic quality gate

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging, dev]

concurrency:
  group: pull-request-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
      issues: write
    steps:
      - id: quality
        name: NPM pull request quality gate
        uses: meblabs/npm-pull-request-action@v4
        with:
          token: ${{ secrets.MEBBOT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          node-version: 22.x
          prettier: true
          eslint: true
          audit: true
          audit-level: high
          test: true
```

### Full example with checkout and private npm setup outside the action

Use this when the repository requires custom npm authentication before `npm ci`.

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging, dev]

concurrency:
  group: pull-request-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
      issues: write
    outputs:
      prettier-changed: ${{ steps.quality.outputs.prettier-changed }}
      audit-changed: ${{ steps.quality.outputs.audit-changed }}
      current-head-sha: ${{ steps.quality.outputs.current-head-sha }}
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: ${{ github.event.pull_request.head.ref }}

      - name: Setup npm credentials
        env:
          FontAwesomeKey: ${{ secrets.FONT_AWESOME_KEY }}
        run: sed "s/__FontAwesomeKey__/${FontAwesomeKey}/g" .npmrc.template > .npmrc

      - id: quality
        name: NPM pull request quality gate
        uses: meblabs/npm-pull-request-action@v4
        with:
          checkout: false
          token: ${{ secrets.MEBBOT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          node-version: 22.x
          prettier: true
          eslint: true
          audit: true
          audit-level: high
          test: true
```

---

## Detailed behavior and logic

### Checkout

Runs only if:

```yml
checkout: true
```

The action checks out the pull request head branch with:

```yml
fetch-depth: 0
ref: ${{ github.event.pull_request.head.ref }}
token: ${{ inputs.github-token }}
```

If your workflow already checks out the repository, set:

```yml
checkout: false
```

### Node setup

The action configures Node.js with:

```yml
uses: actions/setup-node@v6
with:
  node-version: ${{ inputs.node-version }}
  cache: npm
```

Default Node version:

```text
22.x
```

### Install dependencies

The action installs dependencies with:

```bash
npm ci
```

This requires a committed and valid `package-lock.json`.

### Prettier

Runs if:

```yml
prettier: true
```

Executes:

```bash
npm run format
```

The action then checks whether the working tree changed.

If Prettier produces changes, `prettier-changed` is set to `true`.

The action does not commit immediately after Prettier. This allows npm audit to run in the same execution and lets the action create one consolidated automatic commit if either Prettier, npm audit, or both changed files.

### npm audit lockfile remediation

Runs if:

```yml
audit: true
```

Executes:

```bash
npm audit fix --package-lock-only --audit-level=<audit-level>
```

The action explicitly rejects automatic changes to `package.json`.

If `package.json` is modified by npm audit, the action:

- prints an error;
- reverts `package.json` and `package-lock.json`;
- fails the job.

If `package-lock.json` changes, `audit-changed` is set to `true`.

This remediation is intentionally limited to the lockfile. It is meant to apply compatible vulnerability fixes without changing declared dependency ranges, introducing new direct dependencies, or using `npm audit fix --force`.

### Automatic commit

If either Prettier or npm audit produced changes, the action creates one automatic commit with:

```text
chore: apply automatic formatting and lockfile fixes
```

The commit is pushed to the pull request branch using the configured bot identity.

The commit does **not** include `[skip ci]`.

This is intentional. The next workflow execution must run on the newly pushed commit.

When an automatic commit is created:

- ESLint does not run in the same action execution;
- Jest does not run in the same action execution;
- downstream validation jobs should not run in the same workflow execution;
- the workflow should run again on the newly pushed commit.

### ESLint reviewdog

Runs if:

```yml
eslint: true
```

and only if no automatic commit was created by Prettier or npm audit.

Uses:

```yml
reviewdog/action-eslint@v1
```

Default ESLint flags:

```text
. --ext .js,.jsx,.mjs,.cjs
```

The `token` input is used to post pull request review comments.

### Jest

Runs if:

```yml
test: true
```

and only if no automatic commit was created by Prettier or npm audit.

Executes:

```bash
npm run <test-script> -- --ci --json --outputFile=jest-results.json
```

The Jest execution step is currently non-blocking so that the Jest report can be published even when tests fail.

The report is published with:

```yml
im-open/process-jest-test-results@v2
```

### Quality outputs

At the end of every run, the action writes a GitHub step summary with:

- whether Prettier changed files;
- whether npm audit changed the lockfile;
- the current local `HEAD` SHA.

The outputs are intentionally minimal:

```text
prettier-changed
audit-changed
current-head-sha
```

Use `prettier-changed` and `audit-changed` to decide whether downstream jobs should run.

A downstream job should run only when both values are not `true`:

```yml
if: |
  needs.quality.outputs.prettier-changed != 'true' &&
  needs.quality.outputs.audit-changed != 'true'
```

Use `current-head-sha` as the commit reference for downstream validation:

```yml
ref: ${{ needs.quality.outputs.current-head-sha }}
```

---

## Integration with MEBlabs Security Workflow

This action is focused only on the npm pull request quality gate.

For security scanning, use the separate MEBlabs Security Workflow repository:

<https://github.com/meblabs/security-workflow>

The recommended integration is to run this quality action first, then run the security reusable workflow only when this action did not create an automatic commit.

Example:

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging, dev]

concurrency:
  group: pull-request-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      checks: write
      pull-requests: write
      contents: write
      issues: write
    outputs:
      prettier-changed: ${{ steps.quality.outputs.prettier-changed }}
      audit-changed: ${{ steps.quality.outputs.audit-changed }}
      current-head-sha: ${{ steps.quality.outputs.current-head-sha }}
    steps:
      - id: quality
        name: NPM pull request quality gate
        uses: meblabs/npm-pull-request-action@v4
        with:
          token: ${{ secrets.MEBBOT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          node-version: 22.x
          prettier: true
          eslint: true
          audit: true
          audit-level: high
          test: true

  security:
    name: Security Gate
    needs: quality
    if: |
      needs.quality.outputs.prettier-changed != 'true' &&
      needs.quality.outputs.audit-changed != 'true'
    uses: meblabs/security-workflow/.github/workflows/security.yml@v1
    permissions:
      contents: read
      pull-requests: write
      issues: write
      actions: read
      security-events: write
    with:
      ref: ${{ needs.quality.outputs.current-head-sha }}
      repository: ${{ github.repository }}
      pr-number: ${{ github.event.pull_request.number }}
      head-ref: ${{ github.head_ref }}
    secrets:
      token: ${{ secrets.MEBBOT }}
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

With this structure:

- this action remains independently usable as the npm quality gate;
- security scanning is isolated in its own reusable workflow;
- security does not run on an obsolete commit if Prettier or npm audit pushed automatic changes;
- security scans the exact `current-head-sha` validated by the quality action.

---

## Changelog

### v4.0

- Renamed the action back to **NPM Pull Request Action**.
- Removed the embedded security gate from this composite action.
- Removed all security-specific inputs and steps.
- Focused the action on npm pull request quality checks: install, Prettier, npm audit lockfile remediation, ESLint, and Jest.
- Added controlled npm audit lockfile remediation before tests.
- Changed automatic commit handling so Prettier and npm audit changes are committed together in one consolidated commit when possible.
- Removed `[skip ci]` from automatic Prettier and npm audit commits.
- Added compact output flags for downstream workflow orchestration.
- Added `prettier-changed`, `audit-changed`, and `current-head-sha` outputs.
- Downstream job execution can be controlled by checking that neither `prettier-changed` nor `audit-changed` is `true`.
- Documented optional integration with the separate MEBlabs Security Workflow repository.
- Ensured ESLint and Jest run only when no automatic commit was created in the current action execution.
- Preserved automatic commit protection: npm audit may update `package-lock.json`, but automatic `package.json` changes are rejected.