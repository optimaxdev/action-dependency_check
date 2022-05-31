const core = require('@actions/core')
const Jira = require('./common/net/Jira')
const github = require('@actions/github');

const githubToken = process.env.GITHUB_TOKEN
const octokit = github.getOctokit(githubToken);

const githubEvent = require(process.env.GITHUB_EVENT_PATH)

const prepareData = (data, ignores) => {
  const split = data.split('Unused devDependencies')
  console.log(split[0], split[0].replace('Unused dependencies', ''))
  let dependencies = (split[0] || '').replace('Unused dependencies', '').replaceAll(' ', '').split('*')
  dependencies.splice(0, 1)

  let devDependencies = (split[1] || '').replaceAll(' ', '').split('*')
  if(dependencies.length) devDependencies.splice(0, 1)

  ignores.replaceAll(' ', '').split(',').forEach((ignore) => {
    const idx = dependencies.indexOf(ignore)
    if(idx >= 0) dependencies.splice(idx, 1)

    const idx_dep = devDependencies.indexOf(ignore)
    if(idx_dep >=0) devDependencies.splice(idx_dep, 1)
  })

  return {
    dependencies,
    devDependencies
  }
}

async function exec() {
  try {
    const config = parseArgs();
    let {dependencies, devDependencies} = prepareData(config.depcheck, config.ignores);

    const jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    });

    const platform = githubEvent.repository.html_url.indexOf('Desktop') !== -1 ? 'D' : 'M'

    if(!dependencies.length && !devDependencies.length) {
      return
    }

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
        value: ['Technocal Debt'],
      },
      {
        key: 'description',
        value: `**${config.comment}**
        **BE CAREFULLY!**
        **You should explore each package before itself deleting!!!**
        
        If package has deep mutual consecration with other you should add it to ignore list with path:
        .github/workflows/depcheck.yml in field ignores!
        
        ${dependencies.length && `**dependency:**
          ${dependencies.map(el => el + '/n')}
        `}
        ${devDependencies.length && `**devDependency:**
          ${devDependencies.map(el => el + '/n')}
        `}
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
    core.setOutput("issue", key)
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