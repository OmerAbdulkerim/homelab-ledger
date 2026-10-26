import { seedData } from './seed.js';
// Deliberately in memory: no passwords, session tokens or records in browser storage.
export const store = { data: seedData(), sessionUserId: null };
