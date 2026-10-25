import * as auth from '../services/auth-service.js';
import {shell,escape} from '../../views/ui.js';
import {authView,accountView} from '../../views/auth.js';
import {preview} from '../../views/preview.js';
import {deploymentPreview} from '../services/preview-service.js';
const app = document.querySelector('#app');
export function notify(message) {
 const node=document.querySelector('#notice');node.textContent=message;node.hidden=false;
 clearTimeout(notify.timer);notify.timer=setTimeout(()=>{node.hidden=true;},4500);
}
export function errorPage(code,message) { return `<section class="error-page"><h1>${code === 403?'Access restricted':'Page not found'}</h1><p>${escape(message)}</p><a class="button" href="#/overview">Back to overview</a></section>`; }
export function render() {
 const [section='overview'] = location.hash.replace(/^#\/?/,'').split('/');
 const user=auth.currentUser();
 if (['login','register'].includes(section)) {
  if(user){location.hash='/overview';return;}
  app.innerHTML=authView(section);
 } else if(!user) { location.hash='/login';return; }
 else if(section==='account') app.innerHTML=shell(user,section,accountView(user));
 else if(section==='users' && user.role!=='admin') app.innerHTML=shell(user,section,errorPage(403,'Only an admin can manage users. You can still read the inventory and manage your assigned maintenance.'));
 else if(section==='deployments') app.innerHTML=shell(user,section,preview(deploymentPreview()));
 else app.innerHTML=shell(user,'overview',`<div class="page-content"><h1>Your homelab, in order.</h1><p class="page-intro">A shared record of what runs where, and what needs attention.</p><a class="button primary" href="#/deployments/2">Open deployment inventory</a><p class="inline-note">Static M1 preview. Records and demo accounts reset on refresh.</p></div>`);
 document.title=`${section.charAt(0).toUpperCase()+section.slice(1)} · Homelab Ledger`;
}
export function start() {
 window.addEventListener('hashchange',()=>{render();document.querySelector('#main')?.focus({preventScroll:true});});
 app.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]'); if(!control)return;
  if(control.dataset.action==='logout'){auth.logout();location.hash='/login';notify('Logged out of the preview.');}
  if(control.dataset.action==='demo'){auth.enterDemo(control.dataset.role);location.hash='/overview';}
 });
 app.addEventListener('submit',event=>{
  const form=event.target.closest('[data-form]'); if(!form)return;event.preventDefault();
  const input=Object.fromEntries(new FormData(form));
  try {
   if(form.dataset.form==='login')auth.login(input);
   if(form.dataset.form==='register')auth.register(input);
   if(form.dataset.form==='account'){auth.updateAccount(input);render();notify('Profile saved for this preview.');return;}
   location.hash='/overview';
  }catch(error){const target=form.querySelector('.form-error');target.textContent=error.message;target.hidden=false;}
 });
 render();
}
