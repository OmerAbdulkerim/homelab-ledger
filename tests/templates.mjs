// Open /tests/templates.html through the same local HTTP server as the SPA.
import {loadTemplates} from '../frontend/js/services/template-service.js';
import {seedData} from '../frontend/js/models/seed.js';
import {entities} from '../frontend/js/models/entities.js';
import {shell, errorPage} from '../frontend/js/views/ui.js';
import {authView, accountView} from '../frontend/js/views/auth.js';
import * as inventory from '../frontend/js/views/inventory.js';
import {overviewView} from '../frontend/js/views/overview.js';
import {upstreamResult} from '../frontend/js/views/upstream.js';

const output = document.querySelector('#results');
const passed = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const nativeFetch = globalThis.fetch;
try {
  let requests = 0;
  globalThis.fetch = (...args) => { requests++; return nativeFetch(...args); };
  await loadTemplates();
  await loadTemplates();
  assert(requests === 9, 'Templates should load once, then use the cache.');
  passed.push('Nine HTML files loaded once; repeat calls use the cache.');
  globalThis.fetch = nativeFetch;

  const data = seedData(), admin = data.users[0], regular = data.users[1];
  assert(authView('login').querySelector('[data-form="login"]'), 'Login template missing.');
  assert(authView('register').querySelector('[name="confirm_password"]'), 'Registration confirmation missing.');
  assert(accountView(admin).querySelector('[name="name"]').value === 'Omer', 'Profile values missing.');
  assert(overviewView(data, admin).querySelectorAll('.server-summary').length === 2, 'Overview relationships missing.');
  for (const entity of Object.keys(entities)) {
    const row = data[entity][0];
    const detail = inventory.inventoryDetail(entity, row, data, admin);
    const page = inventory.workspace(entity, data[entity], row, data, admin, detail, {hasSelection: true});
    assert(page.querySelector('.record-list').children.length === data[entity].length, `${entity}: list missing records.`);
    assert(page.querySelector('[data-action="delete"]'), `${entity}: admin delete missing.`);
    const form = inventory.editForm(entity, {}, data, admin, true);
    assert(form.querySelector('[data-form="record"]').dataset.entity === entity, `${entity}: create form missing.`);
    assert(!form.querySelector('[data-fields]'), `${entity}: form fields were not inserted.`);
  }
  passed.push('Login, register, account, overview and all five entity forms/details render.');

  const payload = '<img src=x onerror="throw new Error(1)"><script>bad()</script>';
  const untrusted = {...data.servers[0], name: payload, notes: payload};
  const detail = inventory.inventoryDetail('servers', untrusted, data, admin);
  assert(detail.querySelector('h2').textContent === payload, 'Record name must remain text.');
  assert(!detail.querySelector('script, img'), 'User input created HTML elements.');
  const form = inventory.editForm('servers', untrusted, data, admin, false);
  assert(form.querySelector('[name="name"]').value === payload, 'Input value was not preserved.');
  assert(form.querySelector('[name="notes"]').value === payload, 'Textarea value was not preserved.');
  assert(!form.querySelector('script, img'), 'Form values created HTML elements.');
  passed.push('Hostile markup stays literal text in details, inputs and textareas.');

  const userPage = shell(regular, 'servers', inventory.inventoryDetail('servers', data.servers[0], data, regular));
  assert(!userPage.querySelector('a[href="#/users"]'), 'Regular user sees admin navigation.');
  assert(!userPage.querySelector('[data-action="delete"]'), 'Regular user sees admin delete.');
  const taskForm = inventory.editForm('maintenance', data.maintenance[2], data, regular, false);
  assert(taskForm.querySelector('[name="status"]'), 'Assigned user cannot edit task status.');
  assert(!taskForm.querySelector('[name="assigned_user_id"]'), 'Regular user can assign tasks.');
  assert(errorPage(403, payload).querySelector('p').textContent === payload, 'Error message is not safe text.');
  for (const state of ['sample', 'no-release', 'failure', 'unlinked']) {
    const result = upstreamResult({state, tag: payload, message: payload, repositoryUrl: 'https://example.com', releaseUrl: 'https://example.com'}, 'v2.12.0');
    assert(!result.querySelector('script, img'), `${state}: unsafe upstream rendering.`);
  }
  passed.push('Role-aware controls, task fields, error pages and upstream states remain safe.');

  const retryModule = await import('../frontend/js/services/template-service.js?retry-check');
  globalThis.fetch = (url, options) => url.pathname.endsWith('/account.html')
    ? Promise.resolve(new Response('Not found', {status: 404})) : nativeFetch(url, options);
  let rejected = false;
  try { await retryModule.loadTemplates(); } catch { rejected = true; }
  assert(rejected, 'A failed HTTP response was silently accepted.');
  let partial = false;
  try { retryModule.cloneTemplate('shell-view'); partial = true; } catch { /* Atomic cache remains empty. */ }
  assert(!partial, 'A failed load exposed partially loaded templates.');
  globalThis.fetch = nativeFetch;
  await retryModule.loadTemplates();
  assert(retryModule.cloneTemplate('account-view').querySelector('form'), 'Retry did not recover.');
  passed.push('A missing template rejects without a partial cache; retry recovers.');
  output.textContent = `PASS (${passed.length} checks)\n\n${passed.join('\n')}`;
  document.title = 'PASS · Native HTML template checks';
} catch (error) {
  output.textContent = `FAIL: ${error.message}\n\n${passed.join('\n')}`;
  document.title = 'FAIL · Native HTML template checks';
  console.error(error);
} finally {
  globalThis.fetch = nativeFetch;
}
