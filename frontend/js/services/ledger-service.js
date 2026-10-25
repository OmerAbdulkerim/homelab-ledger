import {store} from '../models/store.js';
import {currentUser,setUserPassword,forgetUserPassword} from './auth-service.js';
import {required,httpUrl,email,password} from '../models/validation.js';
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
 if(entity==='maintenance') {
  const actor=requireUser(),existing=store.data.maintenance.find(row=>row.id===existingId);
  const originalTarget=existing?`${existing.server_id?'server':'deployment'}:${existing.server_id||existing.deployment_id}`:'';
  if(actor.role!=='admin'&&existing){
   if((input.target!==undefined&&input.target!==originalTarget)||(input.assigned_user_id!==undefined&&String(input.assigned_user_id)!==String(existing.assigned_user_id??''))||(input.due_on!==undefined&&input.due_on!==existing.due_on))throw new Error('Only an admin can change a task’s target, assignee or due date.');
  }
  const target=String(input.target??originalTarget).match(/^(server|deployment):(\d+)$/);
  if(!target)throw new Error('Choose exactly one server or deployment for this task.');
  const targetId=reference(target[1]==='server'?'servers':'deployments',target[2],'related record');
  const status=actor.role!=='admin'&&!existing?'open':String(input.status||'open');
  if(!['open','in_progress','completed'].includes(status))throw new Error('Choose a valid task status.');
  const assigned_user_id=actor.role==='admin'?reference('users',input.assigned_user_id,'assignee',true):(existing?.assigned_user_id??null);
  const outcome=optionalText(input.outcome,'Outcome',5000);
  if(status==='completed'&&!outcome)throw new Error('Record an outcome before completing this task.');
  return {title:required(input.title,'Title',160),description:optionalText(input.description,'Description',5000),server_id:target[1]==='server'?targetId:null,deployment_id:target[1]==='deployment'?targetId:null,assigned_user_id,status,due_on:date(actor.role!=='admin'&&existing?existing.due_on:input.due_on,'due date'),outcome,completed_at:status==='completed'?(existing?.completed_at||new Date().toISOString()):null};
 }
 if(entity==='users') {
  const address=email(input.email),role=required(input.role,'Role');
  if(!['admin','user'].includes(role))throw new Error('Choose a valid role.');
  if(store.data.users.some(row=>row.id!==existingId&&row.email===address))throw new Error('That email is already in use.');
  const existing=store.data.users.find(row=>row.id===existingId);
  if(existing?.role==='admin'&&role!=='admin'&&store.data.users.filter(row=>row.role==='admin').length===1)throw new Error('Keep at least one admin in the workspace.');
  if(!existing)password(input.password);
  return {name:required(input.name,'Name',80),email:address,role};
 }
 throw new Error('Unknown record type.');
}
export function save(entity,input,id=null) {
 const actor=requireUser();const rows=records(entity),existing=id===null?null:rows.find(row=>row.id===Number(id));
 if(id!==null&&!existing)throw new Error('This record no longer exists. Return to the list.');
 if(actor.role!=='admin'&&(entity!=='maintenance'||(existing&&existing.assigned_user_id!==actor.id)))throw new Error('Only an admin or the assigned user can change this record.');
 const clean=validated(entity,input,existing?.id);
 if(existing)Object.assign(existing,clean);
 else {const created={...clean,id:Math.max(0,...rows.map(row=>row.id))+1};rows.push(created);if(entity==='users')setUserPassword(created.id,input.password);return copy(created);}
 return copy(existing);
}
export function remove(entity,id) {
 requireAdmin();const rows=records(entity),record=rows.find(row=>row.id===Number(id));
 if(!record)throw new Error('This record no longer exists.');
 if(entity==='servers' && store.data.deployments.some(row=>row.server_id===record.id))throw new Error('Move or remove this server’s deployments before deleting it.');
 if(entity==='applications' && store.data.deployments.some(row=>row.application_id===record.id))throw new Error('Remove this application’s deployments before deleting it.');
 if(entity==='servers' && store.data.maintenance.some(row=>row.server_id===record.id))throw new Error('This server has maintenance records. Resolve those references before deleting it.');
 if(entity==='deployments' && store.data.maintenance.some(row=>row.deployment_id===record.id))throw new Error('This deployment has maintenance records. Resolve those references before deleting it.');
 if(entity==='users'){
  if(record.id===currentUser().id)throw new Error('You cannot delete your active account.');
  if(record.role==='admin'&&store.data.users.filter(row=>row.role==='admin').length===1)throw new Error('Keep at least one admin in the workspace.');
  store.data.maintenance.forEach(task=>{if(task.assigned_user_id===record.id)task.assigned_user_id=null;});
  forgetUserPassword(record.id);
 }
 rows.splice(rows.indexOf(record),1);
}
