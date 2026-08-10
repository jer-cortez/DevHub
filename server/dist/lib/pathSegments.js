"use strict";
/**
 * Turns a file path into the normalized tokens used to match expertise across
 * repositories.
 *
 * Exact paths don't match across repos — `payments-service/src/auth/token.ts`
 * and `shared-utils/lib/authentication/tokens.py` describe the same expertise
 * and share no path component. Reducing both to `{auth, token}` is what makes
 * "who has worked on auth anywhere" answerable, and keeps the result
 * explainable: the matched tokens are shown to the user as the evidence, so a
 * suggestion reads as "touched auth, token in 3 repos" rather than a score.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathToSegments = pathToSegments;
exports.changesetSegments = changesetSegments;
/**
 * Structural words that appear in nearly every repository and therefore carry
 * no signal about *what* someone knows. Matching on these would make everyone
 * look like an expert in everything.
 */
const STOP_SEGMENTS = new Set([
    'src', 'lib', 'app', 'apps', 'pkg', 'packages', 'internal', 'core', 'common',
    'dist', 'build', 'out', 'vendor', 'node', 'modules', 'target', 'bin',
    'index', 'main', 'mod', 'init', 'setup',
    'test', 'tests', 'spec', 'specs', 'mocks', 'fixtures', 'snapshots',
    'ts', 'js', 'tsx', 'jsx', 'py', 'go', 'rb', 'java', 'rs', 'php', 'cs',
    'json', 'yaml', 'yml', 'toml', 'md', 'txt', 'lock', 'sql', 'css', 'scss', 'html',
    'new', 'old', 'tmp', 'temp', 'misc', 'helper', 'helpers',
    'the', 'and', 'for', 'with',
]);
/**
 * Collapses spellings of the same concept. Deliberately small and hand-picked
 * rather than a stemmer: aggressive stemming produces confusing evidence
 * strings ("touched authent in 3 repos"), and a wrong merge is worse than a
 * missed one because it silently suggests the wrong person.
 */
const ALIASES = {
    authentication: 'auth', authn: 'auth', authorization: 'auth', authz: 'auth', login: 'auth',
    database: 'db', databases: 'db', postgres: 'db', postgresql: 'db', sql: 'db',
    configuration: 'config', configs: 'config', settings: 'config',
    internationalization: 'i18n', localization: 'i18n', locale: 'i18n',
    payments: 'payment', billing: 'payment', checkout: 'payment', invoice: 'payment',
    notifications: 'notification', notify: 'notification',
    subscriptions: 'subscription', subscribe: 'subscription',
    migrations: 'migration', schemas: 'schema',
    components: 'component', controllers: 'controller', services: 'service',
    models: 'model', routes: 'route', handlers: 'handler', middlewares: 'middleware',
    utilities: 'util', utils: 'util',
    websockets: 'websocket', sockets: 'websocket', ws: 'websocket',
    caching: 'cache', redis: 'cache',
    queries: 'query', mutations: 'mutation',
    permissions: 'permission', roles: 'permission', acl: 'permission',
    analytics: 'analytic', metrics: 'metric', telemetry: 'metric',
    users: 'user', accounts: 'account', profiles: 'profile',
    webhooks: 'webhook', hooks: 'hook',
    uploads: 'upload', storage: 'upload', s3: 'upload',
    emails: 'email', mailer: 'email', mail: 'email',
    search: 'search', indexing: 'search', elasticsearch: 'search',
};
/**
 * Collapses a simple English plural to its singular so `tokens.py` matches
 * `tokenValidator.ts` — without this, the two halves of the same concept sit
 * in different buckets and never match, which is the exact case the feature
 * exists to catch.
 *
 * Deliberately conservative: words ending in `ss`, `us`, `is`, or `os`
 * (status, access, process, analysis, macos) are left alone, since chopping
 * their last letter invents a word that matches nothing.
 */
function depluralize(token) {
    if (token.length <= 3)
        return token;
    if (/(ss|us|is|os)$/.test(token))
        return token;
    if (token.endsWith('ies'))
        return `${token.slice(0, -3)}y`;
    if (token.endsWith('s'))
        return token.slice(0, -1);
    return token;
}
/**
 * Alias first, then depluralize — order matters. `settings` is aliased
 * straight to `config`; depluralizing first would turn it into `setting`,
 * which no alias covers, and the mapping would be lost.
 */
function normalize(token) {
    const aliased = ALIASES[token];
    if (aliased)
        return aliased;
    const singular = depluralize(token);
    return ALIASES[singular] ?? singular;
}
/** Splits an identifier on camelCase, snake_case, kebab-case, and dots. */
function splitIdentifier(raw) {
    return raw
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((s) => s.toLowerCase());
}
/**
 * Extracts the matchable tokens from one file path.
 *
 * Returns a deduplicated array — a path like `auth/auth_service.ts` shouldn't
 * count auth twice and outweigh a genuinely broader touch.
 */
function pathToSegments(filePath) {
    const tokens = filePath
        .split('/')
        .flatMap(splitIdentifier)
        .map(normalize)
        // Single characters and pure numbers ("v2", "2") are noise.
        .filter((token) => token.length > 2 && !/^\d+$/.test(token))
        .filter((token) => !STOP_SEGMENTS.has(token));
    return [...new Set(tokens)];
}
/**
 * The combined token set for a whole changeset, ordered by how many files
 * each token appears in — the most-touched concept first, so evidence strings
 * lead with what the PR is mostly about.
 */
function changesetSegments(filePaths) {
    const counts = new Map();
    for (const path of filePaths) {
        for (const segment of pathToSegments(path)) {
            counts.set(segment, (counts.get(segment) ?? 0) + 1);
        }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([segment]) => segment);
}
