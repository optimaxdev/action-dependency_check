# eslint-disable-jira
Create a Jira issue for removing unused dependency in package.json

## Usage
> ##### Note: this action requires [Jira Login Action](https://github.com/marketplace/actions/jira-login)

Example workflow which is triggered on schedule:
```yaml
name: "DepCheck"
on:
  schedule:
    - cron:  '* * 28 * *'

jobs:
  dep-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2.3.4
        with:
          node-version: 14.x
      - name: Login
        uses: atlassian/gajira-login@master
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BOT_URL }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_BOT_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_BOT_TOKEN }}
      - name: Install depcheck
        run: npm i -g depcheck
      - name: Run depcheck on client
        id: step_client
        run: echo "::set-output name=result::$(depcheck --skip-missing=true | tr '\n' ' ')"
      - name: Create Jira Task client
        uses: optimaxdev/action-dependency_check@master
        with:
          project: GUSA
          issuetype: Improvement
          baseUrl: ${{ secrets.JIRA_BOT_URL }}
          email: ${{ secrets.JIRA_BOT_EMAIL }}
          token: ${{ secrets.JIRA_BOT_TOKEN }}
          depcheck: ${{ steps.step_client.outputs.result }}
          comment: ON CLIENT
          ignores: '@actions/core, depcheck' # example
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```




When change localfile
1) install npm i -g @vercel/ncc
2) ncc build index.js -o dist

When add in another repo