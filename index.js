const core = require('@actions/core')
const Jira = require('./common/net/Jira')

const githubEvent = require(process.env.GITHUB_EVENT_PATH)

async function exec() {
  try {
    const config = parseArgs();

    const ignores = config.ignores

    const jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    });

    const platform = githubEvent.repository.html_url.indexOf('Desktop') !== -1 ? 'D' : 'M'

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
        key: 'customfield_12601', //  team field
        value: {value: 'Gusa Growth'},
      },
      {
        key: 'labels',
        value: ['dependencies'],
      },
      {
        key: 'description',
        value: `**${config.comment}**
        **BE CAREFULLY!**
        **You should explore each package before itself deleting!!!**
        
        If package has deep mutual consecration with other you should add it to ignore list with path:
        .github/workflows/depcheck.yml in field ignores!
        
        ${config.depcheck}
       `,
      },
    ]

    const payload = providedFields.reduce((acc, field) => {
      acc.fields[field.key] = field.value

      return acc
    }, {
      fields: {},
    })

    const key = await jira.createIssue(payload).key
    if (!key) {
      throw new Error('Task is not created')
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
    baseUrl: core.getInput('baseUrl'),
    email: core.getInput('email'),
    token: core.getInput('token'),
    depcheck: core.getInput('depcheck'),
    ignores: core.getInput('ignore'),
    comment: core.getInput('comment'),
  }
}

exec()