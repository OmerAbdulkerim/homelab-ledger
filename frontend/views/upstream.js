import {escape,icon} from './ui.js';
export function upstreamContainer(application,installed='') {
 return `<section class="detail-section upstream-section" data-upstream data-application-id="${application.id}" data-installed="${escape(installed)}"><h3>Upstream reference</h3><div data-upstream-result aria-live="polite" aria-busy="true"><p class="muted">Loading sample release…</p></div>${application.github_owner?`<label class="preview-state">Preview state<select name="upstream_mode" aria-label="Upstream preview state"><option value="sample">Sample release</option><option value="no-release">No published release</option><option value="failure">GitHub unavailable</option></select></label>`:''}</section>`;
}
export function upstreamResult(result,installed) {
 if(result.state==='unlinked')return '<p class="muted">No GitHub repository linked. An admin can add one to the application record.</p>';
 const installedColumn=installed?`<div><span>Installed</span><strong>${escape(installed)}</strong></div>`:'';
 if(result.state==='failure')return `<div class="upstream-failure"><p>${escape(result.message)}</p>${installed?`<p class="muted">Installed: ${escape(installed)}</p>`:''}<button class="text-button" data-action="retry-upstream">Show sample release</button></div>`;
 if(result.state==='no-release')return `<div class="version-comparison">${installedColumn}<div><span>Latest release (sample)</span><strong class="no-release-value">No published release</strong></div></div><a class="release-link" href="${escape(result.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')} Open repository</a><p class="api-caption">Sample response. Inventory remains available.</p>`;
 return `<div class="version-comparison">${installedColumn}<div><span>Latest release (sample)</span><strong>${escape(result.tag)}</strong></div></div><a class="release-link" href="${escape(result.releaseUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')} Read release notes</a><p class="api-caption">Sample GitHub data · ${escape(result.name)} · ${escape(result.language)} · 21 Oct 2026</p>`;
}
