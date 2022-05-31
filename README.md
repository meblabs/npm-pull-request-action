# NPM Pull Request Action

GitHub action for MEBlabs pull request in npm projects.

The action optionaly format code with prettier, check eslint errors/warnings and run jest test with coverege.

## How to use

Package requierment
- prettier 
- jest 
- eslint with plugin

Add followign script to package.json:

```json
"scripts": {
	"format": "prettier --write **/*.{json,js,yml,md}",
}
```

Example of workflow

```yml
name: PullRequest

on:
  pull_request:
    branches: [release, staging]

jobs:
  pullrequest:
    runs-on: ubuntu-latest
    steps:
      - name: npm pull request
        uses: meblabs/npm-pull-request-action@main
        with:
          # prettier: true | false (default true)
          # eslint: true | false (default true)
          # test: true | false (default true)
```