import { emptyState, VERSION } from './models.js';
const DB_NAME = 'mi-finanzas-local';
const STORE = 'finance';
const KEY = 'datos';
function db() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
export async function load() { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(STORE, 'readonly'); const q = tx.objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result ?? null); q.onerror = () => rej(q.error); tx.oncomplete = () => d.close(); }); }
export async function save(state) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(state, KEY); tx.oncomplete = () => { d.close(); res(); }; tx.onerror = () => { d.close(); rej(tx.error); }; tx.onabort = () => { d.close(); rej(tx.error); }; }); }
const names = ['accounts', 'categories', 'movements', 'payrolls', 'portfolios', 'assets', 'trades', 'dividends', 'prices', 'goals', 'budgets', 'recurrings'];
export function validateBackup(value) {
    if (!value || typeof value !== 'object')
        throw Error('El archivo no contiene un objeto JSON válido.');
    const v = value;
    if (v.version !== VERSION)
        throw Error('Versión de copia no compatible: ' + String(v.version));
    for (const key of names) {
        if (!Array.isArray(v[key]) || v[key].length > 100000)
            throw Error(`Campo inválido: ${key}`);
        const ids = new Set();
        for (const item of v[key]) {
            if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id))
                throw Error(`Registro/identificador inválido en ${key}`);
            ids.add(item.id);
        }
    }
    const s = { ...emptyState(), ...v, demo: Boolean(v.demo) };
    const ids = (key) => new Set(s[key].map(x => x.id));
    const accounts = ids('accounts'), cats = ids('categories'), assets = ids('assets'), portfolios = ids('portfolios');
    const finite = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 1e13;
    for (const a of s.accounts) {
        if (!a.name || !(a.kind === 'debt' ? typeof a.openingBalance === 'number' && Number.isFinite(a.openingBalance) && a.openingBalance <= 0 && a.openingBalance > -1e13 : finite(a.openingBalance)) || !/^(\d{4}-\d{2}-\d{2})$/.test(a.openingDate))
            throw Error('Cuenta inválida');
    }
    for (const m of s.movements) {
        if (!accounts.has(m.accountId) || !finite(m.amount) || m.amount <= 0 || !m.date || !['income', 'expense', 'transfer'].includes(m.kind) || m.kind === 'transfer' && (!accounts.has(m.toAccountId ?? '') || m.toAccountId === m.accountId))
            throw Error('Movimiento inválido');
    }
    for (const p of s.payrolls) {
        if (!accounts.has(p.accountId) || ![p.gross, p.withholding, p.social, p.flex, p.net].every(finite) || !p.date)
            throw Error('Nómina inválida');
    }
    for (const a of s.assets) {
        if (!portfolios.has(a.portfolioId) || !finite(a.price) || !a.name)
            throw Error('Activo inválido');
    }
    for (const t of s.trades) {
        if (!assets.has(t.assetId) || !['buy', 'sell', 'grant'].includes(t.kind) || !finite(t.quantity) || t.quantity <= 0 || !finite(t.unitPrice) || !finite(t.fee) || !t.date || (t.kind !== 'grant' && !accounts.has(t.accountId ?? '')))
            throw Error('Operación de inversión inválida');
    }
    for (const d of s.dividends) {
        if (!assets.has(d.assetId) || !accounts.has(d.accountId) || ![d.gross, d.tax, d.fee].every(finite) || d.gross < d.tax + d.fee)
            throw Error('Dividendo inválido');
    }
    for (const q of s.prices) {
        if (!assets.has(q.assetId) || !finite(q.price) || !q.date)
            throw Error('Precio inválido');
    }
    for (const g of s.goals) {
        if (!finite(g.target) || g.target <= 0 || !finite(g.allocated))
            throw Error('Objetivo inválido');
    }
    for (const b of s.budgets) {
        if (!cats.has(b.categoryId) || !finite(b.amount))
            throw Error('Presupuesto inválido');
    }
    for (const r of s.recurrings) {
        if (!accounts.has(r.accountId) || !cats.has(r.categoryId) || !finite(r.amount) || r.amount <= 0 || !Number.isInteger(r.day) || r.day < 1 || r.day > 31)
            throw Error('Regla recurrente inválida');
    }
    return s;
}
