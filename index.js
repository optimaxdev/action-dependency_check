const core = require('@actions/core');
const Jira = require('./common/net/Jira');
const github = require('@actions/github');

const SUMMARY = 'Delete unused packages from package.json';

const filterUnresolvedDeps = async (config, dependencies, devDependencies) => {
  const jira = new Jira({
    baseUrl: config.baseUrl,
    token: config.token,
    email: config.email,
  });

  const jiraTasks = await jira.searchDepcheckIssues({comment: config.comment, summary: `${github.context.repo.repo} ${SUMMARY}`});

  const prevDependencies = new Set();
  const prevDevDependencies = new Set();

  jiraTasks?.issues?.forEach((issue) => {
    issue.fields.description.match(/\*dependency:\*\n.*{{([^}}]+)}}/)?.[1]?.split(', ')?.forEach((a) => prevDependencies.add(a));
    issue.fields.description.match(/\*devDependency:\*\n.*{{([^}}]+)}}/)?.[1]?.split(', ')?.forEach((a) => prevDevDependencies.add(a));
  });

  console.log('unresolved dependencies:', prevDependencies);
  console.log('unresolved devDependencies:', prevDevDependencies);

  return {
    dependencies: dependencies.filter(d => prevDependencies.has(d)),
    devDependencies: devDependencies.filter(d => prevDevDependencies.has(d)),
  }
}

const prepareData = async (config) => {
  const {depcheck, ignores} = config;

  const split = depcheck.split('Unused devDependencies');

  let dependencies = (split[0] || '').replace('Unused dependencies', '').replace(/ /g, '').split('*');
  dependencies.splice(0, 1);

  let devDependencies = (split[1] || '').replace(/ /g, '').split('*');
  if(devDependencies.length) devDependencies.splice(0, 1);

  console.log({ignores});

  ignores.replace(/ /g, '').split(',').forEach((ignore) => {
    const idx = dependencies.indexOf(ignore);
    if(idx >= 0) dependencies.splice(idx, 1);

    const idx_dep = devDependencies.indexOf(ignore);
    if(idx_dep >=0) devDependencies.splice(idx_dep, 1);
  });

  if (dependencies.length > 0 || devDependencies.length > 0) {
    return await filterUnresolvedDeps(config);
  }

  return {
    dependencies,
    devDependencies
  }
}

async function exec() {
  try {
    const config = parseArgs();

    console.log({config});

    const jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    });

    let {dependencies, devDependencies} = await prepareData(jira, config);

    if(!dependencies.length && !devDependencies.length) {
      return
    }

    console.log('new dependencies', dependencies);
    console.log('new devDependencies', devDependencies);

    return

    const platform = github.context.repo.repo;

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
        value: `${platform} - ${SUMMARY}`,
      },
      {
        key: 'customfield_12601', //  team field
        value: {value: 'Gusa Growth'},
      },
      {
        key: 'labels',
        value: ['TechnicalDebt'],
      },
      {
        key: 'description',
        value: `*${config.comment}*
        *BE CAREFULLY!*
        *You should explore each package before itself deleting!!!*
        
        If package has deep mutual consecration with other you should add it to ignore list with path:
        .github/workflows/depcheck.yml in field ignores!
        
        ${dependencies.length > 0 && `*dependency:*
          {{${dependencies.join(', ')}}}
        `}
        ${devDependencies.length > 0 && `*devDependency:*
          {{${devDependencies.join(', ')}}}
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

  /*  const jiraTask = await jira.createIssue(payload)
    console.log({jiraTask, payload})
    if (!jiraTask.key) {
      throw new Error('Task is not created')
    }
    core.setOutput("issue", jiraTask.key)*/
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
    ignores: core.getInput('ignores'),
    comment: core.getInput('comment'),
  }
}

exec()