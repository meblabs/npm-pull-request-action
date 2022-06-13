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
The package-lock.json file must be committed and can not be in the .gitignore

## Workflow

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging]

jobs:
  pullrequest:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      pull-requests: write
      contents: read
    steps:
      - name: npm pull request
        uses: meblabs/npm-pull-request-action@v1.0
        with:
          # prettier: true | false (default true)
          # eslint: true | false (default true)
          # test: true | false (default true)
```
