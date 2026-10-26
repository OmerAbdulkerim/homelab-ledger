import { cloneTemplate } from '../services/template-service.js';
const paths = {
  overview: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  servers: 'M3 3h18v7H3ZM3 14h18v7H3ZM7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6',
  applications: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  deployments: 'm12 3 9 5v9l-9 5-9-5V8Zm0 10 9-5M12 13 3 8M12 13v9M7.5 5.5l9 5',
  maintenance: 'm14 6 4 4 3-3a7 7 0 0 1-9 9l-6 6-4-4 6-6a7 7 0 0 1 9-9Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  search: 'm21 21-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  arrow: 'm9 5 7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  external: 'M15 3h6v6M10 14 21 3M21 14v7H3V3h7',
  edit: 'm16 3 5 5-13 13H3v-5ZM13 6l5 5',
  close: 'm6 6 12 12M6 18 18 6',
  back: 'm12 5-7 7 7 7M5 12h15',
  document: 'M6 3h8l4 4v14H6ZM14 3v5h5M9 12h6M9 16h6',
  logout: 'M9 3H3v18h6M14 8l5 4-5 4M7 12h12',
  check: 'm5 12 4 4L19 6',
  account: 'M20 21a8 8 0 0 0-16 0M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9',
};

export function icon(name, className = '') {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  const attributes = {
    class: `icon ${className}`.trim(),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.7',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };
  Object.entries(attributes).forEach(([key, value]) =>
    svg.setAttribute(key, value),
  );
  const path = document.createElementNS(namespace, 'path');
  path.setAttribute('d', paths[name] || paths.document);
  svg.append(path);
  return svg;
}

export function view(id) {
  const fragment = cloneTemplate(id);
  fragment.querySelectorAll('[data-icon]').forEach((slot) => {
    if (slot.dataset.icon) slot.replaceWith(icon(slot.dataset.icon));
  });
  return fragment;
}

export function element(id) {
  return view(id).firstElementChild;
}
export function nodes(...children) {
  const fragment = document.createDocumentFragment();
  fragment.append(
    ...children.filter((child) => child !== null && child !== undefined),
  );
  return fragment;
}
export function text(root, selector, value) {
  root.querySelector(selector).textContent = value ?? '';
}

export function link(href, label, external = false) {
  const node = document.createElement('a');
  node.href = href;
  node.textContent = label ?? '';
  if (external) {
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
  return node;
}

export function actionLink(label, href, iconName, primary = false) {
  const node = element('action-link');
  node.href = href;
  text(node, '[data-label]', label);
  if (iconName) node.querySelector('[data-icon]').replaceWith(icon(iconName));
  else node.querySelector('[data-icon]').remove();
  node.classList.toggle('primary', primary);
  if (/^https?:/.test(href)) {
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
  return node;
}

export const sections = [
  ['overview', 'Overview'],
  ['servers', 'Servers'],
  ['applications', 'Applications'],
  ['deployments', 'Deployments'],
  ['maintenance', 'Maintenance'],
  ['users', 'Users'],
];
export function shell(user, section, content) {
  const root = view('shell-view');
  text(root, '[data-user-name]', user.name);
  text(
    root,
    '[data-user-role]',
    `/ ${user.role === 'admin' ? 'Admin' : 'User'}`,
  );
  const nav = root.querySelector('.section-nav');
  for (const [key, label] of sections) {
    if (key === 'users' && user.role !== 'admin') continue;
    const item = element('nav-item');
    item.href = `#/${key}`;
    item.querySelector('[data-icon]').replaceWith(icon(key));
    text(item, '[data-label]', label);
    if (section === key) item.setAttribute('aria-current', 'page');
    nav.append(item);
  }
  root.querySelector('main').append(content);
  return root;
}

export function errorPage(code, message) {
  const node = element('error-page');
  text(node, 'h1', code === 403 ? 'Access restricted' : 'Page not found');
  text(node, 'p', message);
  return node;
}
