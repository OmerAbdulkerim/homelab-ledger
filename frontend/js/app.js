import {loadTemplates} from './services/template-service.js';
import {start} from './controllers/app-controller.js';

const app = document.querySelector('#app');
const startup = document.querySelector('[data-startup-state]');
const retry = document.querySelector('#retry-templates');
const error = startup.querySelector('[role="alert"]');
const loading = startup.querySelector('[data-loading]');

async function boot() {
  app.setAttribute('aria-busy', 'true');
  error.hidden = true;
  loading.hidden = false;
  retry.hidden = true;
  try {
    await loadTemplates();
  } catch {
    loading.hidden = true;
    error.hidden = false;
    retry.hidden = false;
    app.setAttribute('aria-busy', 'false');
    return;
  }
  start();
  app.setAttribute('aria-busy', 'false');
}
retry.addEventListener('click', boot);
boot();
