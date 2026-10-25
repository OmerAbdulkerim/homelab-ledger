import * as auth from '../services/auth-service.js';
import * as ledger from '../services/ledger-service.js';
import {entities} from '../models/entities.js';
import {shell,escape} from '../../views/ui.js';
import {authView,accountView} from '../../views/auth.js';
import * as inventory from '../../views/inventory.js';
import {preview} from '../../views/preview.js';
import {deploymentPreview} from '../services/preview-service.js';
const app = document.querySelector('#app');
const searches={},filters={};
let routeSection='overview';
export function notify(message) {
 const node=document.querySelector('#notice');node.textContent=message;node.hidden=false;
 clearTimeout(notify.timer);notify.timer=setTimeout(()=>{node.hidden=true;},4500);
}
export function errorPage(code,message) { return `<section class="error-page"><h1>${code === 403?'Access restricted':'Page not found'}</h1><p>${escape(message)}</p><a class="button" href="#/overview">Back to overview</a></section>`; }
function filteredRows(entity,data) {
 const needle=(searches[entity]||'').trim().toLowerCase();
 return data[entity].filter(row=>(!filters[entity]||row.status===filters[entity])&&`${inventory.recordName(entity,row,data)} ${inventory.recordSubtitle(entity,row,data)} ${row.hostname||''} ${row.installed_version||''}`.toLowerCase().includes(needle));
}
function renderEntity(entity,id,action,user) {
 const data=ledger.snapshot(),isNew=id==='new',editing=isNew||action==='edit';
 const row=id && !isNew?data[entity].find(item=>item.id===Number(id)):data[entity][0];
 if(id&&!isNew&&!row)return errorPage(404,'This record does not exist. It may have been removed.');
 if(editing && user.role!=='admin' && (entity!=='maintenance'||(!isNew&&row.assigned_user_id!==user.id)))return errorPage(403,'You do not have permission to edit this record.');
 const detail=editing?inventory.editForm(entity,isNew?{}:row,data,user,isNew):inventory.inventoryDetail(entity,row,data,user);
 return inventory.workspace(entity,filteredRows(entity,data),row,data,user,detail,{search:searches[entity],filter:filters[entity],hasSelection:Boolean(id),editing});
}
export function render() {
 const parts=location.hash.replace(/^#\/?/,'').split('/');
 const [section='overview',id,action]=parts;routeSection=section;
 const user=auth.currentUser();
 if (['login','register'].includes(section)) {
  if(user){location.hash='/overview';return;}
  app.innerHTML=authView(section);
 } else if(!user) { location.hash='/login';return; }
 else {
  let content;
  if(section==='account')content=accountView(user);
  else if(section==='users'&&user.role!=='admin')content=errorPage(403,'Only an admin can manage users. You can still read inventory and work on assigned maintenance.');
  else if(Object.hasOwn(entities,section)&&parts.length<=3&&(!action||action==='edit'))content=renderEntity(section,id,action,user);
  else if(section==='deployments')content=preview(deploymentPreview());
  else if(section==='overview'||section==='')content=`<div class="page-content"><h1>Your homelab, in order.</h1><p class="page-intro">A shared record of what runs where, and what needs attention.</p><div class="form-actions"><a class="button primary" href="#/servers">Open servers</a><a class="button" href="#/applications">Open applications</a><a class="button" href="#/deployments/2">Open deployments</a></div><p class="inline-note">Static M1 preview. Records and demo accounts reset on refresh.</p></div>`;
  else content=errorPage(404,'This page is not part of your workspace.');
  app.innerHTML=shell(user,section,content);
 }
 document.title=`${section.charAt(0).toUpperCase()+section.slice(1)} · Homelab Ledger`;
}
function showFormError(form,error) {const target=form.querySelector('.form-error');target.textContent=error.message;target.hidden=false;}
function updateList() {
 if(!Object.hasOwn(entities,routeSection))return;
 const data=ledger.snapshot(),id=Number(location.hash.split('/')[2])||data[routeSection][0]?.id;
 app.querySelector('.record-list').innerHTML=inventory.recordList(routeSection,filteredRows(routeSection,data),id,data);
}
export function start() {
 window.addEventListener('hashchange',()=>{render();document.querySelector('#main')?.focus({preventScroll:true});});
 app.addEventListener('input',event=>{
  if(event.target.matches('input[type="search"]')){searches[routeSection]=event.target.value;updateList();}
 });
 app.addEventListener('change',event=>{
  if(event.target.name==='status_filter'){filters[routeSection]=event.target.value;updateList();}
 });
 app.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]');if(!control)return;
  const action=control.dataset.action;
  if(action==='logout'){auth.logout();location.hash='/login';notify('Logged out of the preview.');}
  if(action==='demo'){auth.enterDemo(control.dataset.role);location.hash='/overview';}
  if(action==='clear-search'){searches[routeSection]='';filters[routeSection]='';render();}
  if(action==='delete'){
   const entity=control.dataset.entity,row=ledger.get(entity,control.dataset.id);
   app.querySelector('#delete-dialog')?.remove();app.insertAdjacentHTML('beforeend',inventory.deleteDialog(entity,row,ledger.snapshot()));
   document.querySelector('#delete-dialog').showModal();
  }
  if(action==='cancel-delete')document.querySelector('#delete-dialog').close();
  if(action==='confirm-delete'){
   try{ledger.remove(control.dataset.entity,control.dataset.id);document.querySelector('#delete-dialog').close();location.hash=`/${control.dataset.entity}`;notify('Record removed from the preview.');}
   catch(error){showFormError(document.querySelector('#delete-dialog'),error);}
  }
 });
 app.addEventListener('submit',event=>{
  const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();
  const input=Object.fromEntries(new FormData(form));
  try {
   if(form.dataset.form==='login')auth.login(input);
   if(form.dataset.form==='register')auth.register(input);
   if(form.dataset.form==='record'){
    const row=ledger.save(form.dataset.entity,input,form.dataset.id?Number(form.dataset.id):null);
    location.hash=`/${form.dataset.entity}/${row.id}`;notify('Record saved for this preview.');return;
   }
   if(form.dataset.form==='account'){auth.updateAccount(input);render();notify('Profile saved for this preview.');return;}
   location.hash='/overview';
  }catch(error){showFormError(form,error);}
 });
 render();
}
