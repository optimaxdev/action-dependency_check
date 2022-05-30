const core = require('@actions/core')
const Jira = require('./common/net/Jira')

// eslint-disable-next-line import/no-dynamic-require
const githubEvent = require(process.env.GITHUB_EVENT_PATH)
// const depcheck = require("depcheck");

async function exec() {
  try {
    const config = parseArgs();
    console.log(config);

    // depcheck('').then((unused) => {
    //   console.log(unused.dependencies); // an array containing the unused dependencies
    //   console.log(unused.devDependencies); // an array containing the unused devDependencies
    //   console.log(unused.missing); // a lookup containing the dependencies missing in `package.json` and where they are used
    //   console.log(unused.using); // a lookup indicating each dependency is used by which files
    //   console.log(unused.invalidFiles); // files that cannot access or parse
    //   console.log(unused.invalidDirs); // directories that cannot access
    // });

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
      core.setOutput("issues", 5)
      return 32
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
    workdir: core.getInput('workdir'),
    ignores: core.getInput('ignore'),
    comment: core.getInput('comment'),
  }
}

exec()