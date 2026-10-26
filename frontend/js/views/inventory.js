import { entities } from '../models/entities.js';
import { element, view, nodes, text, icon, link, actionLink } from './ui.js';
import { upstreamContainer } from './upstream.js';

export const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Sarajevo',
      }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
    : 'No date';

export function recordName(entity, row, data) {
  if (entity === 'deployments')
    return (
      data.applications.find((app) => app.id === row.application_id)?.name ||
      'Unknown application'
    );
  return row.name || row.title;
}
export function recordSubtitle(entity, row, data) {
  if (entity === 'servers') return row.purpose;
  if (entity === 'applications') return row.description;
  if (entity === 'deployments')
    return `${data.servers.find((server) => server.id === row.server_id)?.name || 'Unknown server'} · ${row.label}`;
  if (entity === 'maintenance')
    return `${row.status.replaceAll('_', ' ')} · ${dateLabel(row.due_on)}`;
  return row.role === 'admin' ? 'Admin' : row.email;
}

export function recordList(entity, rows, selectedId, data) {
  if (!rows.length) return element('empty-search');
  return nodes(
    ...rows.map((row, index) => {
      const item = element('record-row');
      item.href = `#/${entity}/${row.id}`;
      item.classList.toggle('selected', row.id === selectedId);
      if (row.id === selectedId) item.setAttribute('aria-current', 'true');
      const symbol = item.querySelector('.app-symbol');
      symbol.classList.add(`symbol-${index % 4}`);
      symbol.append(icon(entity === 'deployments' ? 'document' : entity));
      text(item, 'strong', recordName(entity, row, data));
      text(item, '.record-name > span', recordSubtitle(entity, row, data));
      return item;
    }),
  );
}

export function workspace(
  entity,
  rows,
  selected,
  data,
  user,
  detail,
  state = {},
) {
  const definition = entities[entity];
  const root = element('workspace-view');
  root.classList.toggle('has-selection', Boolean(state.hasSelection));
  root
    .querySelector('.record-index')
    .setAttribute('aria-label', `${definition.label} index`);
  text(root, 'h1', definition.label);
  const add = root.querySelector('[data-add]');
  if (user.role === 'admin' || entity === 'maintenance') {
    add.href = `#/${entity}/new`;
    text(add, '[data-label]', `Add ${definition.singular}`);
  } else add.remove();
  const search = root.querySelector('input[type="search"]');
  search.placeholder = `Search ${definition.label.toLowerCase()}…`;
  search.setAttribute('aria-label', `Search ${definition.label.toLowerCase()}`);
  search.value = state.search || '';
  root
    .querySelector('.record-list')
    .append(recordList(entity, rows, selected?.id, data));
  const filter = root.querySelector('.index-filter');
  if (['deployments', 'maintenance'].includes(entity)) {
    const statuses =
      entity === 'deployments'
        ? ['running', 'stopped', 'planned']
        : ['open', 'in_progress', 'completed'];
    const select = filter.querySelector('select');
    statuses.forEach((value) =>
      select.append(new Option(value.replaceAll('_', ' '), value)),
    );
    select.value = state.filter || '';
  } else filter.remove();
  const article = root.querySelector('.record-detail');
  article.classList.toggle('editing', Boolean(state.editing));
  const back = article.querySelector('.back-to-list');
  back.href = `#/${entity}`;
  text(back, '[data-label]', `Back to ${definition.label.toLowerCase()}`);
  article.append(detail);
  return root;
}

export function fields(pairs) {
  const list = element('record-fields');
  pairs.forEach(([label, value]) => {
    const row = element('record-field');
    text(row, 'dt', label);
    row.querySelector('dd').append(value ?? '');
    list.append(row);
  });
  return list;
}
export function detailHeader(title, subtitle, actions = null) {
  const heading = element('detail-header');
  text(heading, 'h2', title);
  text(heading, '.subtitle', subtitle);
  if (actions) heading.querySelector('.heading-actions').append(actions);
  return heading;
}
export function adminActions(entity, row, user) {
  return user.role === 'admin'
    ? actionLink(
        `Edit ${entities[entity].singular}`,
        `#/${entity}/${row.id}/edit`,
        'edit',
      )
    : null;
}
export function deleteAction(entity, row, user) {
  if (user.role !== 'admin') return null;
  const footer = element('delete-action');
  const button = footer.querySelector('button');
  button.dataset.entity = entity;
  button.dataset.id = row.id;
  button.textContent = `Delete ${entities[entity].singular}`;
  return footer;
}
export function notes(value) {
  const section = element('notes-section');
  text(section, 'p', value || 'No notes yet.');
  return section;
}

function tableSection(title, headers, rows, emptyMessage) {
  const section = element('table-section');
  text(section, 'h3', title);
  if (!rows.length) {
    section.querySelector('.table-scroll').remove();
    const message = element('paragraph');
    message.className = 'muted';
    message.textContent = emptyMessage;
    section.append(message);
    return section;
  }
  const heading = section.querySelector('thead tr');
  headers.forEach((label) => {
    const cell = document.createElement('th');
    cell.textContent = label;
    heading.append(cell);
  });
  rows.forEach((values) => {
    const row = document.createElement('tr');
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.append(value ?? '');
      row.append(cell);
    });
    section.querySelector('tbody').append(row);
  });
  return section;
}
export function relatedDeployments(rows, data) {
  return tableSection(
    'Deployments',
    ['Application', 'Label', 'Server', 'Installed'],
    rows.map((row) => [
      link(`#/deployments/${row.id}`, recordName('deployments', row, data)),
      row.label,
      link(
        `#/servers/${row.server_id}`,
        data.servers.find((server) => server.id === row.server_id)?.name,
      ),
      row.installed_version || 'Not recorded',
    ]),
    'No deployments recorded.',
  );
}
export function maintenanceTable(rows, data) {
  const section = tableSection(
    'Maintenance',
    ['Task', 'Due', 'Assigned'],
    rows.map((row) => [
      nodes(
        link(`#/maintenance/${row.id}`, row.title),
        row.status === 'completed' ? element('completed-label') : null,
      ),
      row.due_on ? dateLabel(row.due_on) : 'No due date',
      data.users.find((user) => user.id === row.assigned_user_id)?.name ||
        'Unassigned',
    ]),
    'No maintenance recorded for this item.',
  );
  section.querySelectorAll('tbody tr').forEach((row, index) => {
    row.children[1].classList.toggle('due', rows[index].status !== 'completed');
  });
  return section;
}

export function inventoryDetail(entity, row, data, user) {
  if (!row) {
    const empty = element('empty-inventory');
    text(empty, 'h2', `No ${entities[entity].label.toLowerCase()} yet`);
    text(
      empty,
      'p',
      user.role === 'admin'
        ? `Add the first ${entities[entity].singular}.`
        : 'An admin can add inventory records.',
    );
    return empty;
  }
  if (entity === 'deployments') return deploymentDetail(row, data, user);
  if (entity === 'maintenance') return taskDetail(row, data, user);
  if (entity === 'users') return userDetail(row, data, user);
  let body;
  if (entity === 'servers') {
    const tasks = data.maintenance.filter(
      (item) =>
        item.server_id === row.id ||
        data.deployments.some(
          (deployment) =>
            deployment.id === item.deployment_id &&
            deployment.server_id === row.id,
        ),
    );
    body = nodes(
      fields([
        ['Hostname', row.hostname],
        ['Purpose', row.purpose],
      ]),
      relatedDeployments(
        data.deployments.filter((item) => item.server_id === row.id),
        data,
      ),
      maintenanceTable(tasks, data),
    );
  } else {
    let repository = 'Not linked';
    if (row.github_owner) {
      repository = link(
        `https://github.com/${encodeURIComponent(row.github_owner)}/${encodeURIComponent(row.github_repo)}`,
        `${row.github_owner}/${row.github_repo}`,
        true,
      );
      repository.append(' ', icon('external'));
    }
    body = nodes(
      fields([
        ['Description', row.description],
        ['Repository', repository],
      ]),
      relatedDeployments(
        data.deployments.filter((item) => item.application_id === row.id),
        data,
      ),
      upstreamContainer(row),
    );
  }
  return nodes(
    detailHeader(
      row.name,
      entity === 'servers' ? row.hostname : row.description,
      adminActions(entity, row, user),
    ),
    body,
    notes(row.notes),
    deleteAction(entity, row, user),
  );
}

function formField(field, row, data, user) {
  const kind =
    field.type === 'textarea'
      ? 'textarea'
      : field.type === 'select'
        ? 'select'
        : 'text';
  const label = element(`field-${kind}`);
  const control = label.querySelector('input, select, textarea');
  const value = row[field.name] ?? '';
  label.htmlFor = `field-${field.name}`;
  text(label, '[data-label]', field.label);
  const hint = label.querySelector('.field-hint');
  if (field.hint) {
    hint.hidden = false;
    hint.textContent = field.hint;
  }
  control.id = label.htmlFor;
  control.name = field.name;
  control.required = Boolean(field.required);
  if (field.type === 'select') {
    const options =
      typeof field.options === 'function'
        ? field.options(data, user, row)
        : field.options;
    options.forEach(([key, title]) =>
      control.append(new Option(title, String(key))),
    );
    if (options.some(([key]) => String(key) === String(value)))
      control.value = String(value);
  } else {
    if (kind === 'text') control.type = field.type || 'text';
    if (field.max) control.maxLength = field.max;
    if (field.min) control.minLength = field.min;
    control.value = field.type === 'password' ? '' : value;
    if (field.type === 'password') control.autocomplete = 'new-password';
  }
  return label;
}
export function editForm(entity, row, data, user, isNew) {
  const definition = entities[entity];
  if (entity === 'maintenance' && !isNew)
    row = {
      ...row,
      target: `${row.server_id ? 'server' : 'deployment'}:${row.server_id || row.deployment_id}`,
    };
  const form = element('entity-form');
  form.dataset.entity = entity;
  if (!isNew) form.dataset.id = row.id;
  const visibleFields = definition.fields.filter(
    (field) =>
      (!field.adminOnly || user.role === 'admin') &&
      (!field.newOnly || isNew) &&
      (!field.userReadOnly || user.role === 'admin' || isNew) &&
      (!field.hideOnRegularCreate || user.role === 'admin' || !isNew),
  );
  form
    .querySelector('[data-fields]')
    .replaceWith(
      ...visibleFields.map((field) => formField(field, row, data, user)),
    );
  text(
    form,
    '[type="submit"]',
    `${isNew ? 'Create' : 'Save'} ${definition.singular}`,
  );
  form.querySelector('[data-cancel]').href =
    `#/${entity}${isNew ? '' : `/${row.id}`}`;
  return nodes(
    detailHeader(
      `${isNew ? 'Add' : 'Edit'} ${definition.singular}`,
      isNew
        ? 'A new record in your sample workspace.'
        : recordName(entity, row, data),
    ),
    form,
  );
}
export function deleteDialog(entity, row, data) {
  const dialog = element('delete-dialog-view');
  text(dialog, 'h2', `Delete ${entities[entity].singular}?`);
  text(dialog, '[data-record-name]', recordName(entity, row, data));
  text(
    dialog,
    '[data-deletion-rule]',
    entity === 'users'
      ? 'Their assigned tasks will become unassigned.'
      : 'Records with dependent deployments or maintenance cannot be removed.',
  );
  const confirm = dialog.querySelector('[data-action="confirm-delete"]');
  confirm.dataset.entity = entity;
  confirm.dataset.id = row.id;
  confirm.textContent = `Delete ${entities[entity].singular}`;
  return dialog;
}

export function deploymentDetail(row, data, user) {
  const application = data.applications.find(
    (item) => item.id === row.application_id,
  );
  const server = data.servers.find((item) => item.id === row.server_id);
  const tasks = data.maintenance.filter(
    (item) => item.deployment_id === row.id,
  );
  const external = row.url
    ? actionLink('Open interface', row.url, 'external', true)
    : null;
  const metadata = fields([
    ['Server', link(`#/servers/${row.server_id}`, server.name)],
    ['Version', row.installed_version || 'Not recorded'],
    ['Status', `Recorded: ${row.status}`],
    [
      'Interface',
      row.url ? link(row.url, new URL(row.url).host, true) : 'Not recorded',
    ],
  ]);
  const body = view('deployment-detail');
  const date = element('text-note');
  date.textContent = `Deployment date: ${row.deployed_on ? dateLabel(row.deployed_on) : 'Not recorded'}. Status is maintained manually.`;
  body
    .querySelector('[data-detail-panel="record"]')
    .append(
      metadata,
      upstreamContainer(application, row.installed_version),
      maintenanceTable(tasks, data),
      notes(row.notes),
      date,
    );
  body
    .querySelector('[data-detail-panel="maintenance"]')
    .prepend(maintenanceTable(tasks, data));
  return nodes(
    detailHeader(
      application.name,
      `${row.label} on ${server.name}`,
      nodes(external, adminActions('deployments', row, user)),
    ),
    body,
    deleteAction('deployments', row, user),
  );
}
export function taskTarget(row, data) {
  if (row.server_id)
    return link(
      `#/servers/${row.server_id}`,
      data.servers.find((item) => item.id === row.server_id)?.name,
    );
  const deployment = data.deployments.find(
    (item) => item.id === row.deployment_id,
  );
  return deployment
    ? link(
        `#/deployments/${deployment.id}`,
        `${recordName('deployments', deployment, data)} / ${deployment.label} on ${data.servers.find((item) => item.id === deployment.server_id)?.name}`,
      )
    : 'Not found';
}
export function taskDetail(row, data, user) {
  const editable = user.role === 'admin' || row.assigned_user_id === user.id;
  const actions = editable
    ? actionLink('Edit task', `#/maintenance/${row.id}/edit`, 'edit')
    : null;
  const badge = element('status-badge');
  badge.classList.add(`status-${row.status}`);
  badge.textContent = row.status.replaceAll('_', ' ');
  const body = view('task-detail');
  text(body, '[data-description]', row.description || 'No description yet.');
  text(body, '[data-outcome]', row.outcome || 'No outcome recorded.');
  if (row.completed_at) {
    const completed = body.querySelector('[data-completed]');
    completed.hidden = false;
    completed.textContent = `Completed ${dateLabel(row.completed_at)}`;
  }
  body.querySelector('[data-read-only]').hidden = editable;
  return nodes(
    detailHeader(
      row.title,
      `Maintenance · ${row.status.replaceAll('_', ' ')}`,
      actions,
    ),
    fields([
      ['Related to', taskTarget(row, data)],
      [
        'Assigned',
        data.users.find((item) => item.id === row.assigned_user_id)?.name ||
          'Unassigned',
      ],
      ['Status', badge],
      ['Due', row.due_on ? dateLabel(row.due_on) : 'No due date'],
    ]),
    body,
    deleteAction('maintenance', row, user),
  );
}
export function userDetail(row, data, user) {
  return nodes(
    detailHeader(
      row.name,
      row.role === 'admin' ? 'Admin' : 'Regular user',
      adminActions('users', row, user),
    ),
    fields([
      ['Email', row.email],
      ['Role', row.role === 'admin' ? 'Admin' : 'Regular user'],
    ]),
    maintenanceTable(
      data.maintenance.filter((task) => task.assigned_user_id === row.id),
      data,
    ),
    element('user-note'),
    deleteAction('users', row, user),
  );
}
