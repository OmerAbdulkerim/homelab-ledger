import { element, text } from './ui.js';
import { dateLabel, recordName, taskTarget } from './inventory.js';

export function overviewView(data, user) {
  const pending = data.maintenance
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => (a.due_on || '9999').localeCompare(b.due_on || '9999'));
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sarajevo',
  }).format(new Date());
  const page = element('overview-view');
  text(
    page,
    '.page-intro',
    `${data.servers.length} servers · ${data.applications.length} applications · ${data.deployments.length} deployments`,
  );
  const work = page.querySelector('[data-maintenance]');
  if (pending.length) {
    const list = element('work-list');
    pending.forEach((task) => {
      const item = element('work-item');
      const title = item.querySelector('.task-title');
      title.href = `#/maintenance/${task.id}`;
      title.textContent = task.title;
      item
        .querySelector('.task-context')
        .append(
          taskTarget(task, data),
          ` · ${data.users.find((row) => row.id === task.assigned_user_id)?.name || 'Unassigned'}`,
        );
      const due = item.querySelector('.task-due');
      const overdue = Boolean(task.due_on && task.due_on < today);
      due.classList.toggle('overdue', overdue);
      due.textContent = task.due_on
        ? `${overdue ? 'Overdue · ' : ''}${dateLabel(task.due_on)}`
        : 'No due date';
      list.append(item);
    });
    work.append(list);
  } else work.append(element('no-pending'));
  const index = page.querySelector('.server-index');
  if (!data.servers.length) index.append(element('no-servers'));
  data.servers.forEach((server) => {
    const summary = element('server-summary');
    summary.querySelector('a').href = `#/servers/${server.id}`;
    text(summary, 'strong', server.name);
    text(summary, '[data-hostname]', server.hostname);
    text(summary, 'p', server.purpose);
    const deployments = data.deployments.filter(
      (row) => row.server_id === server.id,
    );
    const list = summary.querySelector('ul');
    if (!deployments.length) list.append(element('no-deployments'));
    deployments.forEach((row) => {
      const item = element('server-deployment');
      item.querySelector('a').href = `#/deployments/${row.id}`;
      text(item, '[data-name]', recordName('deployments', row, data));
      text(item, '.deployment-label', row.label);
      text(item, '[data-version]', row.installed_version || 'Not recorded');
      list.append(item);
    });
    index.append(summary);
  });
  text(
    page,
    '[data-permissions]',
    user.role === 'admin'
      ? 'You have admin access to all inventory and maintenance records.'
      : 'You can read inventory, create maintenance tasks, and edit tasks assigned to you.',
  );
  return page;
}
