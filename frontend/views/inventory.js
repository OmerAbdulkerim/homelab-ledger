import {entities} from '../js/models/entities.js';
import {escape,icon} from './ui.js';
export const dateLabel = value=>value?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Sarajevo'}).format(new Date(value.length===10?`${value}T12:00:00Z`:value)):'No date';
export function recordName(entity,row,data) {
 if(entity==='deployments')return data.applications.find(app=>app.id===row.application_id)?.name || 'Unknown application';
 return row.name || row.title;
}
export function recordSubtitle(entity,row,data) {
 if(entity==='servers')return row.purpose;
 if(entity==='applications')return row.description;
 if(entity==='deployments')return data.servers.find(server=>server.id===row.server_id)?.name || 'Unknown server';
 if(entity==='maintenance')return `${row.status.replaceAll('_',' ')} · ${dateLabel(row.due_on)}`;
 return row.role==='admin'?'Admin':row.email;
}
export function recordList(entity,rows,selectedId,data) {
 if(!rows.length)return `<div class="empty-state"><h3>No matching records</h3><p>Try a different search, or clear the filters.</p><button class="button" data-action="clear-search">Clear filters</button></div>`;
 return rows.map((row,index)=>`<a class="record-row ${row.id===selectedId?'selected':''}" href="#/${entity}/${row.id}" ${row.id===selectedId?'aria-current="true"':''}><span class="app-symbol symbol-${index%4}">${icon(entity==='deployments'?'document':entity)}</span><span class="record-name"><strong>${escape(recordName(entity,row,data))}</strong><span>${escape(recordSubtitle(entity,row,data))}</span></span>${icon('arrow')}</a>`).join('');
}
export function workspace(entity,rows,selected,data,user,detail,state={}) {
 const definition=entities[entity],editing=state.editing,canCreate=user.role==='admin'||entity==='maintenance';
 return `<div class="workspace ${state.hasSelection?'has-selection':''}"><aside class="record-index" aria-label="${escape(definition.label)} index"><div class="index-title"><h1>${definition.label}</h1>${canCreate?`<a class="button primary" href="#/${entity}/new">${icon('plus')} Add ${definition.singular}</a>`:''}</div><label class="search-field">${icon('search')}<input type="search" placeholder="Search ${definition.label.toLowerCase()}…" aria-label="Search ${definition.label.toLowerCase()}" value="${escape(state.search||'')}"></label>${['deployments','maintenance'].includes(entity)?`<label class="index-filter"><span>Filter by status</span><select name="status_filter" aria-label="Filter by status"><option value="">All statuses</option>${(entity==='deployments'?['running','stopped','planned']:['open','in_progress','completed']).map(value=>`<option value="${value}" ${state.filter===value?'selected':''}>${value.replaceAll('_',' ')}</option>`).join('')}</select></label>`:''}<div class="record-list">${recordList(entity,rows,selected?.id,data)}</div><p class="index-footnote">Sample data · Changes reset on refresh</p></aside><article class="record-detail ${editing?'editing':''}"><a class="back-to-list" href="#/${entity}">${icon('back')} Back to ${definition.label.toLowerCase()}</a>${detail}</article></div>`;
}
export function fields(pairs) {return `<dl class="record-fields">${pairs.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;}
export function detailHeader(title,subtitle,actions='') {return `<div class="record-heading"><div><h2>${escape(title)}</h2><p class="subtitle">${escape(subtitle)}</p></div><div class="heading-actions">${actions}</div></div>`;}
export function adminActions(entity,row,user) {
 if(user.role!=='admin')return '';
 return `<a class="button" href="#/${entity}/${row.id}/edit">${icon('edit')} Edit ${entities[entity].singular}</a>`;
}
export function deleteAction(entity,row,user) {return user.role==='admin'?`<div class="record-footer"><button class="text-button danger-text" data-action="delete" data-entity="${entity}" data-id="${row.id}">Delete ${entities[entity].singular}</button></div>`:'';}
export function notes(text) {return `<section class="detail-section notes-section"><h3>Notes</h3><p class="preserve-lines">${escape(text)||'No notes yet.'}</p></section>`;}
export function relatedDeployments(rows,data) {
 return `<section class="detail-section"><h3>Deployments</h3>${rows.length?`<div class="table-scroll"><table><thead><tr><th>Application</th><th>Server</th><th>Installed</th></tr></thead><tbody>${rows.map(row=>`<tr><td><a href="#/deployments/${row.id}">${escape(recordName('deployments',row,data))}</a></td><td><a href="#/servers/${row.server_id}">${escape(data.servers.find(server=>server.id===row.server_id)?.name)}</a></td><td>${escape(row.installed_version)||'Not recorded'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No deployments recorded.</p>'}</section>`;
}
export function maintenanceTable(rows,data) {
 return `<section class="detail-section" id="related-maintenance"><h3>Maintenance</h3>${rows.length?`<div class="table-scroll"><table><thead><tr><th>Task</th><th>Due</th><th>Assigned</th></tr></thead><tbody>${rows.map(row=>`<tr><td><a href="#/maintenance/${row.id}">${escape(row.title)}</a>${row.status==='completed'?'<span class="completed-label">Completed</span>':''}</td><td class="${row.status==='completed'?'':'due'}">${row.due_on?dateLabel(row.due_on):'No due date'}</td><td>${escape(data.users.find(user=>user.id===row.assigned_user_id)?.name||'Unassigned')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No maintenance recorded for this item.</p>'}</section>`;
}
export function inventoryDetail(entity,row,data,user) {
 if(!row)return `<div class="empty-state"><h2>No ${entities[entity].label.toLowerCase()} yet</h2><p>${user.role==='admin'?`Add the first ${entities[entity].singular}.`:'An admin can add inventory records.'}</p></div>`;
 let body;
 if(entity==='servers')body=fields([['Hostname',escape(row.hostname)],['Purpose',escape(row.purpose)]])+relatedDeployments(data.deployments.filter(item=>item.server_id===row.id),data)+maintenanceTable(data.maintenance.filter(item=>item.server_id===row.id || data.deployments.some(deployment=>deployment.id===item.deployment_id&&deployment.server_id===row.id)),data);
 else body=fields([['Description',escape(row.description)],['Repository',row.github_owner?`<a href="https://github.com/${encodeURIComponent(row.github_owner)}/${encodeURIComponent(row.github_repo)}" target="_blank" rel="noopener noreferrer">${escape(row.github_owner)}/${escape(row.github_repo)} ${icon('external')}</a>`:'Not linked']])+relatedDeployments(data.deployments.filter(item=>item.application_id===row.id),data);
 return detailHeader(row.name,entity==='servers'?row.hostname:row.description,adminActions(entity,row,user))+body+notes(row.notes)+deleteAction(entity,row,user);
}
function formField(field,row,data,user) {
 const value=row[field.name]??'', id=`field-${field.name}`;
 let input;
 if(field.type==='textarea') input=`<textarea id="${id}" name="${field.name}" maxlength="${field.max||5000}" ${field.required?'required':''}>${escape(value)}</textarea>`;
 else if(field.type==='select') {
  const options=typeof field.options==='function'?field.options(data,user,row):field.options;
  input=`<select id="${id}" name="${field.name}" ${field.required?'required':''}>${options.map(([key,label])=>`<option value="${escape(key)}" ${String(key)===String(value)?'selected':''}>${escape(label)}</option>`).join('')}</select>`;
 } else input=`<input id="${id}" name="${field.name}" type="${field.type||'text'}" value="${field.type==='password'?'':escape(value)}" ${field.required?'required':''} ${field.max?`maxlength="${field.max}"`:''} ${field.min?`minlength="${field.min}"`:''} ${field.type==='password'?'autocomplete="new-password"':''}>`;
 return `<label class="${field.type==='textarea'?'full-width':''}" for="${id}">${escape(field.label)}${field.hint?`<span class="field-hint">${escape(field.hint)}</span>`:''}${input}</label>`;
}
export function editForm(entity,row,data,user,isNew) {
 const definition=entities[entity];
 return `${detailHeader(`${isNew?'Add':'Edit'} ${definition.singular}`,isNew?'A new record in your sample workspace.':recordName(entity,row,data))}<form class="ledger-form entity-form" data-form="record" data-entity="${entity}" ${!isNew?`data-id="${row.id}"`:''}>${definition.fields.filter(field=>!field.adminOnly||user.role==='admin').filter(field=>!field.newOnly||isNew).filter(field=>!field.userReadOnly||user.role==='admin'||isNew).map(field=>formField(field,row,data,user)).join('')}<p class="form-error full-width" role="alert" hidden></p><div class="form-actions full-width"><button class="button primary" type="submit">${isNew?'Create':'Save'} ${definition.singular}</button><a class="button" href="#/${entity}${isNew?'':`/${row.id}`}">Cancel</a></div><p class="inline-note full-width">M1 sample data. This change lasts until you refresh the page.</p></form>`;
}
export function deleteDialog(entity,row,data) {
 return `<dialog id="delete-dialog" aria-labelledby="delete-title"><h2 id="delete-title">Delete ${entities[entity].singular}?</h2><p>Remove <strong>${escape(recordName(entity,row,data))}</strong> from this sample workspace? Records with dependent deployments or maintenance cannot be removed.</p><p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button" data-action="cancel-delete" autofocus>Keep record</button><button class="button danger" data-action="confirm-delete" data-entity="${entity}" data-id="${row.id}">Delete ${entities[entity].singular}</button></div></dialog>`;
}
