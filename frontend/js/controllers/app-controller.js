import * as auth from '../services/auth-service.js';
import * as ledger from '../services/ledger-service.js';
import {entities} from '../models/entities.js';
import {shell, errorPage, element} from '../views/ui.js';
import {authView,accountView} from '../views/auth.js';
import * as inventory from '../views/inventory.js';
import {getUpstream} from '../services/upstream-service.js';
import {upstreamResult} from '../views/upstream.js';
import {overviewView} from '../views/overview.js';
const app = document.querySelector('#app');
 document.querySelector('.skip-link').addEventListener('click',event=>{
  event.preventDefault();document.querySelector('#main')?.focus();
 });
const searches={},filters={};
let routeSection='overview',upstreamRequest=0,dirty=false,renderedHash=location.hash;
export function notify(message) {
 const node=document.querySelector('#notice');node.textContent=message;node.hidden=false;
 clearTimeout(notify.timer);notify.timer=setTimeout(()=>{node.hidden=true;},4500);
}

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
 dirty=false;renderedHash=location.hash;
 const parts=location.hash.replace(/^#\/?/,'').split('/');
 const [section='overview',id,action]=parts;routeSection=section;
 const user=auth.currentUser();
 if (['login','register'].includes(section)) {
  if(user){location.hash='/overview';return;}
  app.replaceChildren(authView(section));
 } else if(!user) { location.hash='/login';return; }
 else {
  let content;
  if(section==='account')content=accountView(user);
  else if(section==='users'&&user.role!=='admin')content=errorPage(403,'Only an admin can manage users. You can still read inventory and work on assigned maintenance.');
  else if(Object.hasOwn(entities,section)&&parts.length<=3&&(!action||action==='edit'))content=renderEntity(section,id,action,user);
  else if(section==='overview'||section==='')content=overviewView(ledger.snapshot(),user);
  else content=errorPage(404,'This page is not part of your workspace.');
  app.replaceChildren(shell(user,section,content));
 }
 loadUpstream();
 document.title=`${section.charAt(0).toUpperCase()+section.slice(1)} · Homelab Ledger`;
}
async function loadUpstream(mode='sample') {
 const section=app.querySelector('[data-upstream]');if(!section)return;
 const request=++upstreamRequest,node=section.querySelector('[data-upstream-result]');
 const application=ledger.snapshot().applications.find(row=>row.id===Number(section.dataset.applicationId));
 node.setAttribute('aria-busy','true');
 node.replaceChildren(element('loading-text'));
 const result=await getUpstream(application,mode);
 if(request!==upstreamRequest||!section.isConnected)return;
 node.replaceChildren(upstreamResult(result,section.dataset.installed));node.setAttribute('aria-busy','false');
}
function showFormError(form,error) {document.querySelector('#notice').hidden=true;const target=form.querySelector('.form-error');target.textContent=error.message;target.hidden=false;}
function updateList() {
 if(!Object.hasOwn(entities,routeSection))return;
 const data=ledger.snapshot(),id=Number(location.hash.split('/')[2])||data[routeSection][0]?.id;
 app.querySelector('.record-list').replaceChildren(inventory.recordList(routeSection,filteredRows(routeSection,data),id,data));
}
export function start() {
 window.addEventListener('hashchange',()=>{
  if(dirty&&!window.confirm('Discard your unsaved changes?')){history.replaceState(null,'',renderedHash);return;}
  render();document.querySelector('#main')?.focus({preventScroll:true});
 });
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 app.addEventListener('input',event=>{
  if(event.target.closest('[data-form="record"],[data-form="account"]'))dirty=true;
  if(event.target.matches('input[type="search"]')){searches[routeSection]=event.target.value;updateList();}
 });
 app.addEventListener('change',event=>{
  if(event.target.closest('[data-form="record"],[data-form="account"]'))dirty=true;
  if(event.target.name==='upstream_mode')loadUpstream(event.target.value);
  if(event.target.name==='status_filter'){filters[routeSection]=event.target.value;updateList();}
 });
 app.addEventListener('click',event=>{
  document.querySelector('#notice').hidden=true;
  const control=event.target.closest('[data-action]');if(!control)return;
  const action=control.dataset.action;
  if(action==='detail-tab'){
   app.querySelectorAll('[data-detail-panel]').forEach(panel=>{panel.hidden=panel.dataset.detailPanel!==control.dataset.tab;});
   app.querySelectorAll('[data-action="detail-tab"]').forEach(button=>button.setAttribute('aria-pressed',String(button===control)));
  }
  if(action==='retry-upstream'){const select=app.querySelector('[name="upstream_mode"]');select.value='sample';loadUpstream();}
  if(action==='logout'){if(dirty&&!window.confirm('Discard your unsaved changes and log out?'))return;dirty=false;auth.logout();location.hash='/login';notify('Logged out of the preview.');}
  if(action==='demo'){try{auth.enterDemo(control.dataset.role);location.hash='/overview';}catch(error){showFormError(app.querySelector('form'),error);}}
  if(action==='clear-search'){searches[routeSection]='';filters[routeSection]='';app.querySelector('input[type=search]').value='';const select=app.querySelector('[name=status_filter]');if(select)select.value='';updateList();}
  if(action==='delete'){
   const entity=control.dataset.entity,row=ledger.get(entity,control.dataset.id);
   app.querySelector('#delete-dialog')?.remove();app.append(inventory.deleteDialog(entity,row,ledger.snapshot()));
   document.querySelector('#delete-dialog').showModal();
  }
  if(action==='cancel-delete')document.querySelector('#delete-dialog').close();
  if(action==='confirm-delete'){
   try{ledger.remove(control.dataset.entity,control.dataset.id);document.querySelector('#delete-dialog').close();const next=`#/${control.dataset.entity}`;if(location.hash===next)render();else location.hash=next;notify('Record removed from the preview.');}
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
    dirty=false;location.hash=`/${form.dataset.entity}/${row.id}`;notify('Record saved for this preview.');return;
   }
   if(form.dataset.form==='account'){auth.updateAccount(input);render();notify('Profile saved for this preview.');return;}
   location.hash='/overview';
  }catch(error){showFormError(form,error);}
 });
 render();
}
