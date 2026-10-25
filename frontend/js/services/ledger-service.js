import {store} from '../models/store.js';
import {currentUser} from './auth-service.js';
import {required,httpUrl} from '../models/validation.js';
const copy = value=>structuredClone(value);
function requireUser() { const user=currentUser();if(!user)throw new Error('Log in to use the preview workspace.');return user; }
function requireAdmin() { const user=requireUser();if(user.role!=='admin')throw new Error('Only an admin can change inventory records.');return user; }
function records(entity) { if(!Object.hasOwn(store.data,entity))throw new Error('Unknown record type.');return store.data[entity]; }
export function snapshot() {
 const user=requireUser(), data=copy(store.data);
 if(user.role!=='admin')data.users=data.users.map(({id,name})=>({id,name}));
 return data;
}
export function list(entity) { requireUser();if(entity==='users')requireAdmin();return copy(records(entity)); }
export function get(entity,id) { return list(entity).find(row=>row.id===Number(id)) ?? null; }
function reference(entity,value,label,optional=false) {
 if(optional && (value==='' || value===null || value===undefined))return null;
 const id=Number(value);
 if(!Number.isInteger(id)||!records(entity).some(row=>row.id===id))throw new Error(`Choose a valid ${label}.`);
 return id;
}
function optionalText(value,label,max) {
 const clean=String(value??'').trim();
 if(clean.length>max)throw new Error(`${label} must be ${max} characters or fewer.`);
 return clean;
}
function date(value,label) {
 if(!value)return '';
 const clean=String(value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(clean)||!Number.isFinite(Date.parse(clean))||new Date(clean).toISOString().slice(0,10)!==clean)throw new Error(`Enter a valid ${label}.`);
 return clean;
}
function validated(entity,input,existingId=null) {
 if(entity==='servers') {
  const hostname=required(input.hostname,'Hostname or IP address',253);
  if(!/^[a-zA-Z0-9._:[\]-]+$/.test(hostname))throw new Error('Use a hostname or IP address without spaces, paths or credentials.');
  return {name:required(input.name,'Name',80),hostname,purpose:required(input.purpose,'Purpose',200),notes:optionalText(input.notes,'Notes',5000)};
 }
 if(entity==='applications') {
  const owner=String(input.github_owner??'').trim(),repo=String(input.github_repo??'').trim();
  if(Boolean(owner)!==Boolean(repo))throw new Error('Provide both GitHub owner and repository, or leave both blank.');
  if(owner && (!/^[a-zA-Z0-9-]{1,100}$/.test(owner)||!/^[a-zA-Z0-9_.-]{1,100}$/.test(repo)))throw new Error('Enter the GitHub owner and repository names, not a URL.');
  return {name:required(input.name,'Name',80),description:required(input.description,'Description',500),github_owner:owner,github_repo:repo,notes:optionalText(input.notes,'Notes',5000)};
 }
 if(entity==='deployments') {
  const application_id=reference('applications',input.application_id,'application'),server_id=reference('servers',input.server_id,'server');
  const label=required(input.label,'Environment / label',80),status=required(input.status,'Recorded status');
  if(!['running','stopped','planned'].includes(status))throw new Error('Choose a valid recorded status.');
  const installed_version=optionalText(input.installed_version,'Installed version',100);
  if(status!=='planned'&&!installed_version)throw new Error('Record the installed version, or mark the deployment as planned.');
  if(store.data.deployments.some(row=>row.id!==existingId&&row.application_id===application_id&&row.server_id===server_id&&row.label.toLowerCase()===label.toLowerCase()))throw new Error('That application already has a deployment with this label on this server. Use a different label.');
  return {application_id,server_id,label,status,installed_version,url:httpUrl(input.url),deployed_on:date(input.deployed_on,'deployment date'),notes:optionalText(input.notes,'Notes',5000)};
 }
 throw new Error('This record type is not editable yet.');
}
export function save(entity,input,id=null) {
 requireAdmin();const rows=records(entity),existing=id===null?null:rows.find(row=>row.id===Number(id));
 if(id!==null&&!existing)throw new Error('This record no longer exists. Return to the list.');
 const clean=validated(entity,input,existing?.id);
 if(existing)Object.assign(existing,clean);
 else {const created={...clean,id:Math.max(0,...rows.map(row=>row.id))+1};rows.push(created);return copy(created);}
 return copy(existing);
}
export function remove(entity,id) {
 requireAdmin();const rows=records(entity),record=rows.find(row=>row.id===Number(id));
 if(!record)throw new Error('This record no longer exists.');
 if(entity==='servers' && store.data.deployments.some(row=>row.server_id===record.id))throw new Error('Move or remove this server’s deployments before deleting it.');
 if(entity==='applications' && store.data.deployments.some(row=>row.application_id===record.id))throw new Error('Remove this application’s deployments before deleting it.');
 if(entity==='servers' && store.data.maintenance.some(row=>row.server_id===record.id))throw new Error('This server has maintenance records. Resolve those references before deleting it.');
 if(entity==='deployments' && store.data.maintenance.some(row=>row.deployment_id===record.id))throw new Error('This deployment has maintenance records. Resolve those references before deleting it.');
 rows.splice(rows.indexOf(record),1);
}
