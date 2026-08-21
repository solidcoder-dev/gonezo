const featureContexts = ['account', 'analytics', 'expected', 'imports', 'ledger', 'movements', 'scheduling', 'sharing', 'taxonomy', 'transactions', 'workspace'];
const domainContexts = ['imports', 'ledger', 'sharing', 'taxonomy', 'transactions'];
function joinContexts(contexts) {
  return contexts.join('|');
}

function otherContexts(sourceContext) {
  return featureContexts.filter((context) => context !== sourceContext);
}

function forbiddenFromContext(sourceContext, suffix) {
  return `^src/${sourceContext}/${suffix}`;
}

function forbiddenToContexts(contexts, suffix = '') {
  return `^src/(?:${joinContexts(contexts)})/${suffix}`;
}

function publicApiPatterns(contexts) {
  const targetContexts = joinContexts(contexts);
  return [
    `^src/(?:${targetContexts})/index\\.ts$`,
    `^src/(?:${targetContexts})/public/`,
    `^src/(?:${targetContexts})/application/[^/]+\\.(?:ts|tsx)$`,
    `^src/(?:${targetContexts})/(?:application|ui)/[A-Z][^/]*\\.(?:ts|tsx)$`,
    `^src/(?:${targetContexts})/(?:application|ui)/[^/]+/[A-Z][^/]*\\.(?:ts|tsx)$`,
    `^src/(?:${targetContexts})/(?:application|ui)/[^/]+/[^/]+/[A-Z][^/]*\\.(?:ts|tsx)$`,
    `^src/(?:${targetContexts})/(?:application|ui)/[^/]+(?:Gateway|Port)\\.ts$`,
  ];
}

function crossContextInternalsRule(sourceContext) {
  const targets = otherContexts(sourceContext);
  return {
    name: `${sourceContext}-no-cross-context-internals`,
    severity: 'error',
    from: {
      path: forbiddenFromContext(sourceContext, '(?:application|ui|infrastructure)/'),
    },
    to: {
      path: forbiddenToContexts(targets, ''),
      pathNot: publicApiPatterns(targets),
    },
  };
}

function domainPurityRule(sourceContext) {
  return {
    name: `${sourceContext}-domain-is-pure`,
    severity: 'error',
    from: {
      path: forbiddenFromContext(sourceContext, 'domain/'),
    },
    to: {
      path: [
        '^node_modules/(?:react|react-dom|@capacitor|bootstrap)',
        forbiddenFromContext(sourceContext, '(?:application|ui|infrastructure)/'),
        forbiddenToContexts(otherContexts(sourceContext), ''),
        '^src/shared/(?:ui|testing|utils)/',
      ],
    },
  };
}

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-unresolvable',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    ...domainContexts.map(domainPurityRule),
    domainPurityRule('shared'),
    {
      name: 'application-and-ui-no-infrastructure',
      severity: 'error',
      from: {
        path: `^src/(?:${joinContexts(featureContexts)})/(?:application|ui)/|^src/shared/(?:ui|testing|utils)/`,
      },
      to: {
        path: `^src/(?:${joinContexts(featureContexts)})/infrastructure/`,
      },
    },
    {
      name: 'shared-no-feature-contexts',
      severity: 'error',
      from: {
        path: '^src/shared/',
      },
      to: {
        path: forbiddenToContexts(featureContexts, ''),
      },
    },
    ...featureContexts.map(crossContextInternalsRule),
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
