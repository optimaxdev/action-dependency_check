const core = require('@actions/core')
const github = require('@actions/github');
const YAML = require('yaml')

const Jira = require('./common/net/Jira')
const githubToken = process.env.GITHUB_TOKEN
const octokit = github.getOctokit(githubToken);

const configPath = `${process.env.HOME}/jira/config.yml`
const config = YAML.parse(fs.readFileSync(configPath, 'utf8'))

// eslint-disable-next-line import/no-dynamic-require
const githubEvent = require(process.env.GITHUB_EVENT_PATH)

async function exec() {
  try {
    console.log('1')
    const config = parseArgs();
    console.log(config);

    const jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    });
    console.log('2')
    const jiraIssue = config.issue ? await jira.getIssue(config.issue) : null
    const platform = githubEvent.repository.html_url.indexOf('Desktop') !== -1 ? 'D' : 'M'
    console.log('3')
    let providedFields = [
      {
        key: 'project',
        value: {
          key: config.project,
        },
      },
      {
        key: 'issuetype',
        value: {
          name: config.issuetype,
        },
      },
      {
        key: 'summary',
        value: `${platform} - Delete unused packages from package.json`,
      },
      {
        key: 'assignee',
        value: {accountId: jiraIssue ? jiraIssue.fields.assignee.accountId : '5faa5f3a8405b10077a8fd7e'}, // if there's no jira task then assign to Mikhail Nikolaevskiy in Growth team (change to somebody else onc he's gone)
      },
      {
        key: 'customfield_12601', //  team field
        value: {value: jiraIssue ? jiraIssue.fields.customfield_12601.value : 'Gusa Growth'},
      },
      {
        key: 'labels',
        value: ['dependencies'],
      },
      {
        key: 'description',
        value: `${config.comment}
        BE CAREFULLY!
        You should explore each package before itself deleting!!!
        
        If package has deep mutual consecration with other you should add it to ignore list with path:
        .github/workflows/depcheck.yml in field exclude
       `,
      },
    ]
    console.log('4')
    const payload = providedFields.reduce((acc, field) => {
      acc.fields[field.key] = field.value

      return acc
    }, {
      fields: {},
    })
    console.log('5')
    const key = await jira.createIssue(payload).key
    console.log('6')
    if (key) {
      console.log(`Created issues: ${key.issues}`)
      return
    }
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

function parseArgs() {
  return {
    project: core.getInput('project'),
    issuetype: core.getInput('issuetype'),
    comment: core.getInput('comment') | '',
    baseUrl: core.getInput('baseUrl'),
    email: core.getInput('email'),
    token: core.getInput('token'),
    taskId: core.getInput('taskId'),
    depcheck: JSON.parse(core.getInput('depcheck')),
    exclude: (core.getInput('exclude') | '').split(','),
  }
}

exec()