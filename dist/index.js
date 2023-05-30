/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 863:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { get } = __nccwpck_require__(826)

const serviceName = 'jira'
const { format } = __nccwpck_require__(310)
const client = __nccwpck_require__(79)(serviceName)

class Jira {
  constructor ({ baseUrl, token, email }) {
    this.baseUrl = baseUrl
    this.token = token
    this.email = email
  }

  async getCreateMeta (query) {
    return this.fetch('getCreateMeta', { pathname: '/rest/api/2/issue/createmeta', query })
  }

  async createIssue (body) {
    return this.fetch('createIssue',
      { pathname: '/rest/api/2/issue' },
      { method: 'POST', body })
  }

  async getIssue (issueId, query = {}) {
    try {
      return this.fetch('getIssue', {
        pathname: `/rest/api/3/issue/${issueId}`,
      })
    } catch (error) {
      if (get(error, 'res.status') === 404) {
        return
      }

      throw error
    }
  }

  async getIssueTransitions (issueId) {
    return this.fetch('getIssueTransitions', {
      pathname: `/rest/api/2/issue/${issueId}/transitions`,
    }, {
      method: 'GET',
    })
  }

  async transitionIssue (issueId, data) {
    return this.fetch('transitionIssue', {
      pathname: `/rest/api/3/issue/${issueId}/transitions`,
    }, {
      method: 'POST',
      body: data,
    })
  }

  async searchDepcheckIssues ({comment, summary}) {
    try {
      return this.fetch('searchIssue', {
        pathname: `/rest/api/2/search/`,
        query: {
          jql: `description ~ "${comment} depcheck.yml" AND summary ~ "${summary}" AND resolution=Unresolved ORDER BY created ASC`,
          maxResults: 5,
          fields: 'description'
        },
      })
    } catch (error) {
      if (get(error, 'res.status') === 404) {
        return
      }

      throw error
    }
  }

  async fetch (apiMethodName,
               { host, pathname, query },
               { method, body, headers = {} } = {}) {
    const url = format({
      host: host || this.baseUrl,
      pathname,
      query,
    })

    if (!method) {
      method = 'GET'
    }

    if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (headers.Authorization === undefined) {
      headers.Authorization = `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`
    }

    // strong check for undefined
    // cause body variable can be 'false' boolean value
    if (body && headers['Content-Type'] === 'application/json') {
      body = JSON.stringify(body)
    }

    const state = {
      req: {
        method,
        headers,
        body,
        url,
      },
    }

    try {
      await client(state, `${serviceName}:${apiMethodName}`)
    } catch (error) {
      const fields = {
        originError: error,
        source: 'jira',
      }

      delete state.req.headers

      throw Object.assign(
        new Error('Jira API error'),
        state,
        fields,
        { jiraError: state.res.body.errors })
    }

    return state.res.body
  }
}

module.exports = Jira

/***/ }),

/***/ 79:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fetch = __nccwpck_require__(669)

module.exports = serviceName => async (state, apiMethod = 'unknown') => {
  const response = await fetch(state.req.url, state.req)

  state.res = {
    headers: response.headers.raw(),
    status: response.status,
  }

  state.res.body = await response.text()

  const isJSON = (response.headers.get('content-type') || '').includes('application/json')

  if (isJSON && state.res.body) {
    state.res.body = JSON.parse(state.res.body)
  }

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return state
}

/***/ }),

/***/ 216:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 833:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 826:
/***/ ((module) => {

module.exports = eval("require")("lodash");


/***/ }),

/***/ 669:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 310:
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(216);
const Jira = __nccwpck_require__(863);
const github = __nccwpck_require__(833);

const SUMMARY = 'Delete unused packages from package.json';

const filterUnresolvedDeps = async (config, dependencies, devDependencies) => {
  const jira = new Jira({
    baseUrl: config.baseUrl,
    token: config.token,
    email: config.email,
  });

  const jiraTasks = await jira.searchDepcheckIssues({comment: config.comment, summary: `${github.context.repo.repo} \\- ${SUMMARY} ${config.comment}`});

  const prevDependencies = new Set();
  const prevDevDependencies = new Set();

  jiraTasks?.issues?.forEach((issue) => {
    /* Parse dependencies from description */
    issue.fields.description.match(/\*dependency:\*\n.*{{([^}}]+)}}/)?.[1]?.split(', ')?.forEach((a) => prevDependencies.add(a));
    issue.fields.description.match(/\*devDependency:\*\n.*{{([^}}]+)}}/)?.[1]?.split(', ')?.forEach((a) => prevDevDependencies.add(a));
  });

  console.log('dependencies before filters:', dependencies);
  console.log('devDependencies before filters:', devDependencies);

  console.log('unresolved dependencies:', prevDependencies);
  console.log('unresolved devDependencies:', prevDevDependencies);

  return {
    dependencies: dependencies.filter(d => !prevDependencies.has(d)),
    devDependencies: devDependencies.filter(d => !prevDevDependencies.has(d)),
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
    return await filterUnresolvedDeps(config, dependencies, devDependencies);
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

    let {dependencies, devDependencies} = await prepareData(config);

    console.log('dependencies after filters', dependencies);
    console.log('new devDependencies after filters', devDependencies);

    if(!dependencies.length && !devDependencies.length) {
      console.log('task won\'t be created');
      return;
    }

    const platform = github.context.repo.repo;

    const dependenciesDescription = dependencies.length > 0 ? `*dependency:*
          {{${dependencies.join(', ')}}}
        ` : '';

    const devDependenciesDescription = devDependencies.length > 0 ? `*devDependency:*
          {{${devDependencies.join(', ')}}}
        ` : '';

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
        value: `${platform} - ${SUMMARY} ${config.comment}`,
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
        *BE CAREFUL!*
        *You should explore each package before itself deleting!!!*
        
        If package has deep mutual consecration with other you should add it to ignore list with path:
        .github/workflows/depcheck.yml in field ignores!
        
        Please, don't edit anything bellow it can brake automatization
        
        ${dependenciesDescription}
        
        ${devDependenciesDescription}
       `,
      },
      ...(config.assignee ? [{key: 'assignee', value: {accountId: config.assignee}}] : []),
    ]

    const payload = providedFields.reduce((acc, field) => {
      acc.fields[field.key] = field.value

      return acc
    }, {
      fields: {},
      transition: {
        id: '471', // 'Ready For Development'
      },
    })

    const jiraTask = await jira.createIssue(payload)
    console.log({jiraTask, payload})
    if (!jiraTask.key) {
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
    ignores: core.getInput('ignores'),
    comment: core.getInput('comment'),
    assignee: core.getInput('assignee'),
  }
}

exec()

})();

module.exports = __webpack_exports__;
/******/ })()
;