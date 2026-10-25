// Run: node tests/services.mjs — no dependencies, PHP API or database required.
import assert from 'node:assert/strict';
import {seedData} from '../frontend/js/models/seed.js';
import {store} from '../frontend/js/models/store.js';
import * as auth from '../frontend/js/services/auth-service.js';
import * as ledger from '../frontend/js/services/ledger-service.js';
import {getUpstream} from '../frontend/js/services/upstream-service.js';
import {recordSubtitle} from '../frontend/js/views/inventory.js';

function reset(role='admin') {
 auth.logout();store.data=seedData();auth.enterDemo(role);
}
function rejectsWithoutMutation(action,pattern) {
 const before=structuredClone(store.data);assert.throws(action,pattern);assert.deepEqual(store.data,before);
}

reset();
// CRUD and dependency protection across every inventory entity.
const server=ledger.save('servers',{name:'Scratch',hostname:'scratch.home.example',purpose:'Disposable verification'});
ledger.save('servers',{name:'Scratch edited',hostname:'scratch.home.example',purpose:'Edited'},server.id);
assert.equal(ledger.get('servers',server.id).purpose,'Edited');
const application=ledger.save('applications',{name:'Example',description:'Disposable application',github_owner:'example',github_repo:'example'});
const deploymentInput={application_id:application.id,server_id:server.id,label:'staging',status:'planned',installed_version:'',url:'https://service.example',deployed_on:'2026-10-25'};
const deployment=ledger.save('deployments',deploymentInput);
assert.equal(recordSubtitle('deployments',deployment,ledger.snapshot()),'Scratch edited · staging');
assert.ok(recordSubtitle('deployments',deployment,ledger.snapshot()).toLowerCase().includes('staging'));
const second=ledger.save('deployments',{...deploymentInput,label:'production'});
assert.notEqual(recordSubtitle('deployments',second,ledger.snapshot()),recordSubtitle('deployments',deployment,ledger.snapshot()));
ledger.remove('deployments',second.id);
rejectsWithoutMutation(()=>ledger.remove('servers',server.id),/deployments/);
rejectsWithoutMutation(()=>ledger.remove('applications',application.id),/deployments/);
rejectsWithoutMutation(()=>ledger.save('deployments',deploymentInput),/already/);
ledger.save('deployments',{...deploymentInput,status:'running',installed_version:'commit-abc123'},deployment.id);
assert.equal(ledger.get('deployments',deployment.id).installed_version,'commit-abc123');
const taskInput={title:'Check this deployment',target:`deployment:${deployment.id}`,assigned_user_id:'2',status:'open',due_on:'2026-11-01'};
const task=ledger.save('maintenance',taskInput);
assert.equal(task.server_id,null);assert.equal(task.deployment_id,deployment.id);
rejectsWithoutMutation(()=>ledger.remove('deployments',deployment.id),/maintenance/);
rejectsWithoutMutation(()=>ledger.save('maintenance',{...taskInput,status:'completed'},task.id),/outcome/);
ledger.save('maintenance',{...taskInput,status:'completed',outcome:'Validated sample deployment.'},task.id);
assert.ok(ledger.get('maintenance',task.id).completed_at);
ledger.remove('maintenance',task.id);ledger.remove('deployments',deployment.id);
ledger.remove('applications',application.id);ledger.remove('servers',server.id);
assert.equal(ledger.get('servers',server.id),null);

// Reject invalid links, dates and oversized notes before changing data.
const fixture={application_id:3,server_id:1,label:'qa',status:'planned',installed_version:''};
rejectsWithoutMutation(()=>ledger.save('deployments',{...fixture,url:'javascript:alert(1)'}),/HTTP/);
rejectsWithoutMutation(()=>ledger.save('deployments',{...fixture,url:'https://user:secret@example.com'}),/credentials/);
rejectsWithoutMutation(()=>ledger.save('deployments',{...fixture,deployed_on:'2026-02-31'}),/valid/);
rejectsWithoutMutation(()=>ledger.save('deployments',{...fixture,server_id:999}),/valid/);
rejectsWithoutMutation(()=>ledger.save('deployments',{...fixture,status:'running'}),/version/);
rejectsWithoutMutation(()=>ledger.save('servers',{name:'Scratch',hostname:'test.example',purpose:'Testing',notes:'a'.repeat(5001)}),/5000/);
rejectsWithoutMutation(()=>ledger.save('applications',{name:'Repo',description:'Example',github_owner:'owner'}),/both/);
rejectsWithoutMutation(()=>ledger.save('maintenance',{title:'Bad target',target:'all-servers',status:'open'}),/exactly/);

// User CRUD, account safety, unique identity and assignment cleanup.
rejectsWithoutMutation(()=>ledger.save('users',{name:'Omer',email:'admin@homelab.example',role:'user'},1),/admin/);
rejectsWithoutMutation(()=>ledger.remove('users',1),/active/);
const user=ledger.save('users',{name:'Temp',email:'temp@example.com',role:'user',password:'temporary-123'});
ledger.save('users',{name:'Temp edited',email:'temp@example.com',role:'user'},user.id);
assert.equal(ledger.get('users',user.id).name,'Temp edited');
const assigned=ledger.save('maintenance',{title:'Reassign on user deletion',target:'server:1',assigned_user_id:user.id,status:'open'});
ledger.remove('users',user.id);assert.equal(ledger.get('maintenance',assigned.id).assigned_user_id,null);
ledger.remove('maintenance',assigned.id);
rejectsWithoutMutation(()=>ledger.save('users',{name:'Duplicate',email:'ADMIN@homelab.example',role:'user',password:'temporary-123'}),/email/);

reset('user');
rejectsWithoutMutation(()=>ledger.save('servers',{name:'No access'}),/admin|assigned/);
rejectsWithoutMutation(()=>ledger.remove('applications',1),/admin/);
assert.throws(()=>ledger.list('users'),/admin/);
assert.equal(ledger.snapshot().users[0].email,undefined);
const request=ledger.save('maintenance',{title:'Regular request',target:'server:1',status:'completed',assigned_user_id:1});
assert.equal(request.status,'open');assert.equal(request.assigned_user_id,null);
rejectsWithoutMutation(()=>ledger.save('maintenance',{title:'Someone else’s task',status:'open'},1),/assigned/);
const own=ledger.get('maintenance',3);
rejectsWithoutMutation(()=>ledger.save('maintenance',{title:own.title,status:'open',assigned_user_id:1},3),/admin/);
ledger.save('maintenance',{title:own.title,status:'completed',outcome:'Checked developer service records.'},3);
assert.equal(ledger.get('maintenance',3).status,'completed');
ledger.save('maintenance',{title:own.title,status:'open',outcome:'Reopened for follow-up.'},3);
assert.equal(ledger.get('maintenance',3).completed_at,null);

// Authentication is explicitly a simulation; public registration cannot set role.
auth.logout();assert.throws(()=>ledger.snapshot(),/Log in/);
assert.throws(()=>auth.login({email:'admin@homelab.example',password:'wrong'}),/incorrect/);
const registered=auth.register({name:'New person',email:'new@example.com',password:'made-up-123',confirm_password:'made-up-123',role:'admin'});
assert.equal(registered.role,'user');
auth.updateAccount({name:'New name',email:'new-name@example.com',password:'new-made-up-123',confirm_password:'new-made-up-123'});
auth.logout();assert.equal(auth.login({email:'new-name@example.com',password:'new-made-up-123'}).name,'New name');

reset();
const paperless=ledger.get('applications',2);
assert.equal((await getUpstream(paperless)).tag,'v2.13.0');
assert.equal((await getUpstream(paperless,'failure')).state,'failure');
assert.equal((await getUpstream(paperless,'no-release')).state,'no-release');
assert.equal((await getUpstream({})).state,'unlinked');
assert.equal(ledger.get('deployments',2).installed_version,'v2.12.0');
console.log('PASS: CRUD, references, validation, permissions, demo authentication, and upstream fallback.');
