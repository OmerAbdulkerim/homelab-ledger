import {store} from '../models/store.js';
import {required,email,password} from '../models/validation.js';
// M1 demo credentials ONLY. M4 replaces this with hashed PHP passwords and JWT.
const demoPasswords = new Map([[1,'ledger-admin'],[2,'ledger-user']]);
export function currentUser() {
 const user = store.data.users.find(row=>row.id === store.sessionUserId);
 return user ? {...user} : null;
}
export function login(input) {
 const address = email(input.email);
 const user = store.data.users.find(row=>row.email === address);
 if (!user || demoPasswords.get(user.id) !== input.password) throw new Error('Email or password is incorrect. Try a demo account below.');
 store.sessionUserId = user.id;
 return currentUser();
}
export function register(input) {
 const name = required(input.name,'Name',80);
 const address = email(input.email);
 const secret = password(input.password);
 if (secret !== input.confirm_password) throw new Error('Passwords must match.');
 if (store.data.users.some(row=>row.email === address)) throw new Error('That email is already registered in this preview.');
 const id = Math.max(0,...store.data.users.map(row=>row.id))+1;
 store.data.users.push({id,name,email:address,role:'user'});
 demoPasswords.set(id,secret);
 store.sessionUserId = id;
 return currentUser();
}
export function logout() { store.sessionUserId = null; }
export function enterDemo(role) {
 const user=store.data.users.find(row=>row.role===role && demoPasswords.has(row.id));
 if(!user)throw new Error('No account with that role remains in this preview. Refresh to restore the demo accounts.');
 return login({email:user.email,password:demoPasswords.get(user.id)});
}
export function updateAccount(input) {
 const user = currentUser();
 if (!user) throw new Error('Your preview session has ended. Log in again.');
 const name = required(input.name,'Name',80), address = email(input.email);
 if (store.data.users.some(row=>row.id!==user.id && row.email===address)) throw new Error('That email is already in use.');
 if (input.password) {
  const secret = password(input.password);
  if (secret !== input.confirm_password) throw new Error('Passwords must match.');
  demoPasswords.set(user.id,secret);
 }
 Object.assign(store.data.users.find(row=>row.id===user.id),{name,email:address});
 return currentUser();
}
export function setUserPassword(id, value) { demoPasswords.set(id,password(value)); }
export function forgetUserPassword(id) { demoPasswords.delete(id); }
