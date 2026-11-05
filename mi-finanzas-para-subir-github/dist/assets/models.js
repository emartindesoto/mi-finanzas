export const VERSION = 1;
export const emptyState = () => ({ version: VERSION, demo: false, accounts: [], categories: [], movements: [], payrolls: [], portfolios: [], assets: [], trades: [], dividends: [], prices: [], goals: [], budgets: [], recurrings: [] });
export const id = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
export const euro = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
export const number = (n, digits = 2) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(Number.isFinite(n) ? n : 0);
export const percent = (n) => `${number(n, 2)} %`;
export const dateES = (iso) => iso ? iso.split('-').reverse().join('/') : '—';
export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const amount = (x) => Number(String(x ?? '').trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
export const goodMoney = (n) => Number.isFinite(n) && n >= 0 && n < 1e13;
export const goodPositive = (n) => goodMoney(n) && n > 0;
export function dateOk(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v; }
export function monthOf(d) { return d.slice(0, 7); }
export const iconFor = (kind) => ({ bank: '🏦', cash: '💶', broker: '◈', other: '▤', fund: '◈', stock: '▥', crypto: '₿' }[kind] || '◈');
