// Static frontend assets only. Future backend requests also belong in services.
const files = [
  'shell.html', 'login.html', 'register.html', 'overview.html', 'account.html',
  'entity-list.html', 'entity-form.html', 'entity-detail.html', 'delete-dialog.html'
];
const templates = new Map();
let loading;

async function loadFile(file) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(new URL(`../../views/${file}`, import.meta.url), {signal: controller.signal});
    if (!response.ok) throw new Error('A view template could not be loaded.');
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const entries = [...page.querySelectorAll('template[id]')];
    if (!entries.length) throw new Error('A view file contains no templates.');
    return entries;
  } finally {
    clearTimeout(timeout);
  }
}

export function loadTemplates() {
  if (!loading) {
    loading = Promise.all(files.map(loadFile)).then(groups => {
      const complete = new Map();
      for (const template of groups.flat()) {
        if (complete.has(template.id)) throw new Error('Duplicate view template ID.');
        complete.set(template.id, template);
      }
      // Publish the cache only after every file succeeds. A failed load can retry.
      templates.clear();
      complete.forEach((template, id) => templates.set(id, template));
    }).catch(error => {
      loading = undefined;
      throw error;
    });
  }
  return loading;
}

export function cloneTemplate(id) {
  const template = templates.get(id);
  if (!template) throw new Error(`Unknown view template: ${id}`);
  return document.importNode(template.content, true);
}
