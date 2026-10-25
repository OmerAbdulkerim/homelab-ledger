export function required(value, label, max = 200) {
 const clean = String(value ?? '').trim();
 if (!clean) throw new Error(`${label} is required.`);
 if (clean.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
 return clean;
}
export function email(value) {
 const clean = required(value,'Email',254).toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Enter a valid email address.');
 return clean;
}
export function password(value) {
 const clean = String(value ?? '');
 if (clean.length < 8 || clean.length > 128) throw new Error('Use a password between 8 and 128 characters.');
 return clean;
}
export function httpUrl(value) {
 const clean = String(value ?? '').trim();
 if (!clean) return '';
 if (clean.length > 2048) throw new Error('URL must be 2048 characters or fewer.');
 let parsed;
 try { parsed = new URL(clean); } catch { throw new Error('Enter a full URL beginning with https:// or http://.'); }
 if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use an HTTP(S) URL without embedded credentials.');
 return parsed.href;
}
