import {element, text} from './ui.js';

export function authView(mode = 'login') {
  const page = element('auth-shell');
  const panel = element(mode === 'register' ? 'register-view' : 'login-view');
  panel.append(element('demo-access'));
  page.querySelector('.auth-layout').append(panel);
  return page;
}

export function accountView(user) {
  const page = element('account-view');
  text(page, '.page-intro', `${user.role === 'admin' ? 'Admin' : 'Regular user'} · Profile changes apply to this preview only.`);
  page.querySelector('[name="name"]').value = user.name;
  page.querySelector('[name="email"]').value = user.email;
  return page;
}
