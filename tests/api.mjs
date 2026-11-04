import assert from 'node:assert/strict';

const origin = process.argv[2];
assert.match(
  origin ?? '',
  /^http:\/\/127\.0\.0\.1:\d+$/,
  'Pass the loopback origin of the API running against local sample data.',
);

const testRun = process.env.HOMELAB_API_TEST_RUN;
assert.match(
  testRun ?? '',
  /^[a-f0-9]{32}$/,
  'Set HOMELAB_API_TEST_RUN before contacting the isolated API.',
);

const collection = '/api/servers';
const testHeader = 'X-Homelab-Test-Run';
async function send(path, method, body, contentType = 'application/json') {
  const headers = { [testHeader]: testRun };
  if (body !== undefined) headers['Content-Type'] = contentType;
  const response = await fetch(origin + path, {
    method,
    headers,
    body,
    redirect: 'error',
  });
  assert.ok(
    response.headers.get(testHeader) === testRun,
    'The API did not verify this isolated test run.',
  );
  return response;
}

const seedUsers = [
  { id: 1, email: 'admin@homelab.example', role: 'admin' },
  { id: 2, email: 'user@homelab.example', role: 'user' },
];
const seedResponse = await send('/api/users', 'GET');
assert.equal(seedResponse.status, 200);
const usersBefore = await seedResponse.json();
assert.ok(
  Array.isArray(usersBefore) &&
    usersBefore.length === seedUsers.length &&
    seedUsers.every((seed, index) =>
      Object.entries(seed).every(
        ([field, value]) => usersBefore[index]?.[field] === value,
      ),
    ),
  'The isolated API does not have the original sample users.',
);
usersBefore.forEach(noCredentials);

const spec = await (await send('/openapi.json', 'GET')).json();
assert.deepEqual(Object.keys(spec.paths[collection]).sort(), ['get', 'post']);
assert.deepEqual(Object.keys(spec.paths[`${collection}/{id}`]).sort(), [
  'delete',
  'get',
  'parameters',
  'patch',
]);
assert.equal((await send('/docs', 'GET')).status, 200);

const row = {
  name: '  API check 😀  ',
  hostname: '[2001:db8::1]',
  purpose: 'Temporary API check',
  cpu_cores: 65535,
  ram_mib: 4294967295,
};

assert.equal((await send(collection, 'POST', '[]')).status, 400);
assert.equal((await send(collection, 'POST', '{')).status, 400);
assert.equal((await send(collection, 'POST', '{}', 'text/plain')).status, 415);
assert.equal((await send(collection, 'POST', '{}')).status, 422);

const created = await send(collection, 'POST', JSON.stringify(row));
assert.equal(created.status, 201, await created.clone().text());
const server = await created.json();
assert.ok(Number.isInteger(server.id) && server.id > 0);
const path = `${collection}/${server.id}`;

try {
  assert.equal(created.headers.get('location'), path);
  for (const [field, value] of Object.entries(row)) {
    assert.equal(server[field], value);
  }
  assert.equal(server.storage_gib, null);
  assert.match(
    server.created_at,
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/,
  );
  const list = await send(collection, 'GET');
  assert.equal(list.status, 200);
  assert.deepEqual(
    (await list.json()).find(({ id }) => id === server.id),
    server,
  );

  const patch = (value) => send(path, 'PATCH', JSON.stringify(value));
  for (const invalid of [
    { name: '\u00a0\ufeff' },
    { cpu_model: '\u2003' },
    { hostname: 'https://example.test' },
    { ram_mib: '8' },
    { ram_mib: 4294967296 },
    { cpu_cores: 0 },
    { created_at: server.created_at },
  ]) {
    assert.equal((await patch(invalid)).status, 422);
  }
  assert.deepEqual(await (await send(path, 'GET')).json(), server);

  const updated = await patch({
    cpu_cores: null,
    notes: '<b>Literal text</b>',
  });
  assert.equal(updated.status, 200);
  const result = await updated.json();
  assert.equal(result.cpu_cores, null);
  assert.equal(result.notes, '<b>Literal text</b>');
  assert.equal(result.name, row.name);
  assert.equal(result.created_at, server.created_at);

  const rejected = await send(path, 'PUT');
  assert.equal(rejected.status, 405);
  assert.deepEqual(rejected.headers.get('allow').split(', ').sort(), [
    'DELETE',
    'GET',
    'HEAD',
    'OPTIONS',
    'PATCH',
  ]);
} finally {
  const removed = await send(path, 'DELETE');
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
}

assert.equal((await send(path, 'GET')).status, 404);
console.log('PASS: server CRUD, validation and OpenAPI HTTP checks.');

for (const name of [
  'applications',
  'deployments',
  'maintenance-tasks',
  'users',
]) {
  const base = '/api/' + name;
  assert.deepEqual(Object.keys(spec.paths[base]).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(spec.paths[base + '/{id}']).sort(), [
    'delete',
    'get',
    'parameters',
    'patch',
  ]);
  assert.ok(Array.isArray(await (await send(base, 'GET')).json()));
  assert.equal((await send(base + '/invalid', 'GET')).status, 400);
  assert.equal((await send(base + '/4294967295', 'GET')).status, 404);
}
assert.ok(spec.paths['/api/applications/{id}/release'].get);

async function expect(path, method, status, value) {
  const body = value === undefined ? undefined : JSON.stringify(value);
  const response = await send(path, method, body);
  const result = await response.text();
  assert.equal(response.status, status, `${method} ${path} ${result}`);
  return { response, data: result === '' ? undefined : JSON.parse(result) };
}

const cleanup = [];
async function create(resource, input) {
  const { response, data } = await expect(
    '/api/' + resource,
    'POST',
    201,
    input,
  );
  assert.ok(Number.isInteger(data.id) && data.id > 0);
  const path = `/api/${resource}/${data.id}`;
  cleanup.push(path);
  assert.equal(response.headers.get('location'), path);
  const current = await expect(path, 'GET', 200);
  assert.deepEqual(current.data, data);
  const list = await expect('/api/' + resource, 'GET', 200);
  assert.deepEqual(
    list.data.find(({ id }) => id === data.id),
    data,
  );
  return { path, data };
}

function noCredentials(row) {
  assert.equal('password' in row || 'password_hash' in row, false);
}

const stamp = Date.now();
const testPassword = 'local-check-password';
let failure;
try {
  const host = await create('servers', {
    name: 'M3 integration host',
    hostname: 'm3-integration.example.test',
    purpose: 'Temporary API test',
  });

  const appInput = { name: 'M3 application', description: '  Example 😀  ' };
  await expect('/api/applications', 'POST', 422, {
    ...appInput,
    github_owner: 'owner',
  });
  await expect('/api/applications', 'POST', 422, {
    ...appInput,
    description: '\ufeff\u0085',
  });
  const application = await create('applications', appInput);
  assert.equal(application.data.description, appInput.description);
  const release = application.path + '/release';
  assert.deepEqual((await expect(release, 'GET', 200)).data, {
    state: 'unlinked',
  });
  await expect('/api/applications/4294967295/release', 'GET', 404);
  await expect(application.path, 'PATCH', 422, {
    github_owner: 'owner',
    github_repo: '..',
  });
  const linked = await expect(application.path, 'PATCH', 200, {
    github_owner: 'octocat',
    github_repo: 'Hello-World',
  });
  assert.equal(linked.data.github_repo, 'Hello-World');
  await expect(application.path, 'PATCH', 422, { github_repo: '' });
  const unlinked = await expect(application.path, 'PATCH', 200, {
    github_owner: '',
    github_repo: '',
  });
  assert.equal(unlinked.data.github_owner, '');
  assert.equal(unlinked.data.github_repo, '');

  const deploymentInput = {
    application_id: application.data.id,
    server_id: host.data.id,
    label: 'Staging',
  };
  await expect('/api/deployments', 'POST', 422, {
    ...deploymentInput,
    server_id: 4294967295,
  });
  await expect('/api/deployments', 'POST', 422, {
    ...deploymentInput,
    status: 'running',
    installed_version: '\ufeff',
  });
  const deployment = await create('deployments', deploymentInput);
  assert.equal(deployment.data.status, 'planned');
  const secondInstance = await create('deployments', {
    ...deploymentInput,
    label: 'Production',
  });
  await expect('/api/deployments', 'POST', 409, {
    ...deploymentInput,
    label: 'staging',
  });
  await expect(secondInstance.path, 'PATCH', 409, { label: 'staging' });
  await expect(deployment.path, 'PATCH', 422, { status: 'running' });
  await expect(deployment.path, 'PATCH', 422, {
    url: 'https://user:pass@example.test',
  });
  await expect(deployment.path, 'PATCH', 422, { url: 'javascript:alert(1)' });
  await expect(deployment.path, 'PATCH', 422, { deployed_on: '2026-02-29' });
  await expect(deployment.path, 'PATCH', 422, {
    updated_at: deployment.data.updated_at,
  });
  const running = await expect(deployment.path, 'PATCH', 200, {
    status: 'running',
    installed_version: '  v1.2.3  ',
    deployed_on: '2028-02-29',
    url: 'https://lab.example.test:8443/app',
  });
  assert.equal(running.data.label, deploymentInput.label);
  assert.equal(running.data.created_at, deployment.data.created_at);
  assert.equal(running.data.installed_version, '  v1.2.3  ');
  assert.equal(running.data.deployed_on, '2028-02-29');
  await expect(application.path, 'DELETE', 409);
  await expect(host.path, 'DELETE', 409);

  const email = `m3-${stamp}@example.test`;
  const userInput = { name: 'M3 test user', email, password: testPassword };
  await expect('/api/users', 'POST', 422, { ...userInput, role: 'admin' });
  await expect('/api/users', 'POST', 422, {
    ...userInput,
    email: 'bad-address',
  });
  await expect('/api/users', 'POST', 422, {
    ...userInput,
    password: '😀'.repeat(19),
  });
  await expect('/api/users', 'POST', 422, {
    ...userInput,
    password: 'abcdefgh\u0000',
  });
  const user = await create('users', userInput);
  assert.equal(user.data.role, 'user');
  noCredentials(user.data);
  await expect('/api/users', 'POST', 409, {
    ...userInput,
    email: email.toUpperCase(),
  });
  await expect(user.path, 'PATCH', 422, { password_hash: 'caller-supplied' });
  const changedUser = await expect(user.path, 'PATCH', 200, {
    name: 'Renamed test user',
    password: 'replacement-local-password',
  });
  assert.equal(changedUser.data.name, 'Renamed test user');
  noCredentials(changedUser.data);

  const users = (await expect('/api/users', 'GET', 200)).data;
  users.forEach(noCredentials);
  const adminPath = '/api/users/' + seedUsers[0].id;
  await expect(adminPath, 'PATCH', 409, { role: 'user' });
  await expect(adminPath, 'DELETE', 409);
  assert.equal(
    (await expect(user.path, 'PATCH', 200, { role: 'admin' })).data.role,
    'admin',
  );
  assert.equal(
    (await expect(user.path, 'PATCH', 200, { role: 'user' })).data.role,
    'user',
  );

  const taskBase = '/api/maintenance-tasks';
  const taskInput = {
    title: 'Check deployment',
    assigned_user_id: user.data.id,
  };
  await expect(taskBase, 'POST', 422, taskInput);
  await expect(taskBase, 'POST', 422, {
    ...taskInput,
    deployment_id: deployment.data.id,
    server_id: host.data.id,
  });
  await expect(taskBase, 'POST', 422, { ...taskInput, server_id: 4294967295 });
  const task = await create('maintenance-tasks', {
    ...taskInput,
    server_id: host.data.id,
    due_on: '2028-02-29',
  });
  assert.equal(task.data.status, 'open');
  assert.equal(task.data.completed_at, null);
  await expect(task.path, 'PATCH', 422, { deployment_id: deployment.data.id });
  await expect(task.path, 'PATCH', 422, { due_on: '2026-02-30' });
  await expect(task.path, 'PATCH', 422, {
    completed_at: '2026-11-04 08:00:00',
  });
  await expect(task.path, 'PATCH', 422, {
    status: 'completed',
    outcome: '\u2003\ufeff',
  });
  assert.deepEqual((await expect(task.path, 'GET', 200)).data, task.data);
  const completed = await expect(task.path, 'PATCH', 200, {
    server_id: null,
    deployment_id: deployment.data.id,
    status: 'completed',
    outcome: '  Passed 😀  ',
  });
  assert.equal(completed.data.server_id, null);
  assert.equal(completed.data.outcome, '  Passed 😀  ');
  const utc = Date.parse(completed.data.completed_at.replace(' ', 'T') + 'Z');
  assert.ok(Math.abs(Date.now() - utc) < 60_000);
  const edited = await expect(task.path, 'PATCH', 200, {
    title: 'Deployment verified',
  });
  assert.equal(edited.data.completed_at, completed.data.completed_at);
  const reopened = await expect(task.path, 'PATCH', 200, { status: 'open' });
  assert.equal(reopened.data.completed_at, null);
  await expect(deployment.path, 'DELETE', 409);
  await expect(user.path, 'DELETE', 204);
  assert.equal(
    (await expect(task.path, 'GET', 200)).data.assigned_user_id,
    null,
  );
} catch (error) {
  failure = error;
} finally {
  const errors = failure === undefined ? [] : [failure];
  for (const path of cleanup.reverse()) {
    try {
      const response = await send(path, 'DELETE');
      assert.ok(
        [204, 404].includes(response.status),
        `Cleanup failed for ${path} (${response.status})`,
      );
      await expect(path, 'GET', 404);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0)
    throw new AggregateError(errors, 'M3 API checks failed');
}
console.log(
  'PASS: application, deployment, user and maintenance CRUD and linked-record rules.',
);
