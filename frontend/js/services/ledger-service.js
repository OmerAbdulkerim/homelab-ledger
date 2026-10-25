import {store} from '../models/store.js';
import {currentUser} from './auth-service.js';
import {required} from '../models/validation.js';
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
function validated(entity,input) {
 if(entity==='servers') {
  const hostname=required(input.hostname,'Hostname or IP address',253);
  if(!/^[a-zA-Z0-9._:[\]-]+$/.test(hostname))throw new Error('Use a hostname or IP address without spaces, paths or credentials.');
  return {name:required(input.name,'Name',80),hostname,purpose:required(input.purpose,'Purpose',200),notes:String(input.notes??'').trim().slice(0,5000)};
 }
 if(entity==='applications') {
  const owner=String(input.github_owner??'').trim(),repo=String(input.github_repo??'').trim();
  if(Boolean(owner)!==Boolean(repo))throw new Error('Provide both GitHub owner and repository, or leave both blank.');
  if(owner && (!/^[a-zA-Z0-9-]{1,100}$/.test(owner)||!/^[a-zA-Z0-9_.-]{1,100}$/.test(repo)))throw new Error('Enter the GitHub owner and repository names, not a URL.');
  return {name:required(input.name,'Name',80),description:required(input.description,'Description',500),github_owner:owner,github_repo:repo,notes:String(input.notes??'').trim().slice(0,5000)};
 }
 throw new Error('This record type is not editable yet.');
}
export function save(entity,input,id=null) {
 requireAdmin();const rows=records(entity),existing=id===null?null:rows.find(row=>row.id===Number(id));
 if(id!==null&&!existing)throw new Error('This record no longer exists. Return to the list.');
 const clean=validated(entity,input);
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
 rows.splice(rows.indexOf(record),1);
}
