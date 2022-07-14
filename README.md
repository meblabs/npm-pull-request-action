# NPM Pull Request Action

GitHub action for MEBlabs pull request in npm projects.

The action optionaly format code with prettier, check eslint errors/warnings and run jest test with coverege.

## How to use

Package requierments:

- prettier 
- jest 
- eslint with plugin

Add followign script to package.json:

```json
"scripts": {
	"format": "prettier --write **/*.{json,js,yml,md}",
}
```

In folder `example` there is a configuration for standard NodeJS Rest Api.

### Pay Attenction
- The package-lock.json file must be committed and can not be in the .gitignore
- If you want to run tests you must pass github-token: ${{ secrets.GITHUB_TOKEN}} in addition to token: ${{ secrets.MEBBOT }} and permissions must be set

## Workflow

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging]

jobs:
  pullrequest:
    permissions:
      checks: write
      pull-requests: write
      contents: write
    runs-on: ubuntu-latest
    steps:
      - name: npm pull request
        uses: meblabs/npm-pull-request-action@v1.0
        with:
          # prettier: true | false (default true)
          # eslint: true | false (default true)
          # test: true | false (default true)
          # token: ${{ secrets.MEBBOT }}
          # github-token: ${{ secrets.GITHUB_TOKEN  }}
          # test-script: npx jest
```
