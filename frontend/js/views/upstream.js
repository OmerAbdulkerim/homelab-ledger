import { element, view, text } from './ui.js';

export function upstreamContainer(application, installed = '') {
  const section = element('upstream-section');
  section.dataset.applicationId = application.id;
  section.dataset.installed = installed;
  if (!application.github_owner)
    section.querySelector('.preview-state').remove();
  return section;
}

export function upstreamResult(result, installed) {
  if (result.state === 'unlinked') return element('upstream-unlinked');
  if (result.state === 'failure') {
    const failure = element('upstream-failure');
    text(failure, '[data-message]', result.message);
    if (installed) text(failure, '[data-installed]', `Installed: ${installed}`);
    else failure.querySelector('[data-installed]').remove();
    return failure;
  }
  const root = view('upstream-versions');
  if (installed) text(root, '[data-installed] strong', installed);
  else root.querySelector('[data-installed]').remove();
  const noRelease = result.state === 'no-release';
  const latest = root.querySelector('[data-latest] strong');
  latest.textContent = noRelease ? 'No published release' : result.tag;
  latest.classList.toggle('no-release-value', noRelease);
  const release = root.querySelector('.release-link');
  release.href = noRelease ? result.repositoryUrl : result.releaseUrl;
  text(
    release,
    '[data-label]',
    noRelease ? 'Open repository' : 'Read release notes',
  );
  root.querySelector('.api-caption').hidden = !noRelease;
  return root;
}
