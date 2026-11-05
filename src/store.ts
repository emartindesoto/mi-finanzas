import {emptyState,VERSION,type AppState} from './models.js';
const DB_NAME='mi-finanzas-local';const STORE='finance';const KEY='datos';
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function load():Promise<AppState|null>{const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readonly');const q=tx.objectStore(STORE).get(KEY);q.onsuccess=()=>res(q.result??null);q.onerror=()=>rej(q.error);tx.oncomplete=()=>d.close()})}
export async function save(state:AppState):Promise<void>{const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(state,KEY);tx.oncomplete=()=>{d.close();res()};tx.onerror=()=>{d.close();rej(tx.error)};tx.onabort=()=>{d.close();rej(tx.error)}})}
const names: (keyof AppState)[]=['accounts','categories','movements','payrolls','portfolios','assets','trades','dividends','prices','goals','budgets','recurrings'];
export function validateBackup(value:unknown):AppState{
 if(!value||typeof value!=='object')throw Error('El archivo no contiene un objeto JSON válido.');
 const v=value as Record<string,unknown>;
 if(v.version!==VERSION)throw Error('Versión de copia no compatible: '+String(v.version));
 for(const key of names){if(!Array.isArray(v[key])||(v[key] as unknown[]).length>100000)throw Error(`Campo inválido: ${key}`);const ids=new Set();for(const item of v[key] as Record<string,unknown>[]){if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error(`Registro/identificador inválido en ${key}`);ids.add(item.id)}}
 for(const key of ['snapshots','legacyPositions'])if(v[key]!==undefined&&!Array.isArray(v[key]))throw Error(`Campo inválido: ${key}`);
 const s={...emptyState(),...v,demo:Boolean(v.demo),snapshots:Array.isArray(v.snapshots)?v.snapshots:[],legacyPositions:Array.isArray(v.legacyPositions)?v.legacyPositions:[]} as AppState;
 for(const key of ['snapshots','legacyPositions'] as const){const rows=s[key];if(rows.length>100000)throw Error(`Demasiados registros en ${key}`);const keys=new Set<string>();for(const item of rows){if(!item||typeof item.id!=='string'||!item.id||keys.has(item.id))throw Error(`Identificador inválido en ${key}`);keys.add(item.id)}}
 const ids=(key:keyof AppState)=>new Set((s[key] as {id:string}[]).map(x=>x.id));
 const accounts=ids('accounts'),cats=ids('categories'),assets=ids('assets'),portfolios=ids('portfolios');
 const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1e13;
 for(const snap of s.snapshots){if(!/^\d{4}-\d{2}-\d{2}$/.test(snap.date)||!finite(snap.total)||!snap.source||typeof snap.source!=='string'||(snap.reconciliationGap!==undefined&&(!Number.isFinite(snap.reconciliationGap)||Math.abs(snap.reconciliationGap)>1e13)))throw Error('Fotografía histórica inválida')}
 for(const pos of s.legacyPositions){if(!/^\d{4}-\d{2}-\d{2}$/.test(pos.valuationDate)||!finite(pos.value)||!pos.name||!pos.platform||!['stock','fund','crypto'].includes(pos.kind))throw Error('Posición agregada inválida')}
 for(const a of s.accounts){if(!a.name||!(a.kind==='debt'?typeof a.openingBalance==='number'&&Number.isFinite(a.openingBalance)&&a.openingBalance<=0&&a.openingBalance>-1e13:finite(a.openingBalance))||!/^(\d{4}-\d{2}-\d{2})$/.test(a.openingDate))throw Error('Cuenta inválida')}
 for(const m of s.movements){if(!accounts.has(m.accountId)||!finite(m.amount)||m.amount<=0||!m.date||!['income','expense','transfer'].includes(m.kind)||m.kind==='transfer'&&(!accounts.has(m.toAccountId??'')||m.toAccountId===m.accountId))throw Error('Movimiento inválido')}
 for(const p of s.payrolls){if(!accounts.has(p.accountId)||![p.gross,p.withholding,p.social,p.flex,p.net].every(finite)||!p.date)throw Error('Nómina inválida')}
 for(const a of s.assets){if(!portfolios.has(a.portfolioId)||!finite(a.price)||!a.name)throw Error('Activo inválido')}
 for(const t of s.trades){if(!assets.has(t.assetId)||!['buy','sell','grant'].includes(t.kind)||!finite(t.quantity)||t.quantity<=0||!finite(t.unitPrice)||!finite(t.fee)||!t.date||(t.kind!=='grant'&&!accounts.has(t.accountId??'')))throw Error('Operación de inversión inválida')}
 for(const d of s.dividends){if(!assets.has(d.assetId)||!accounts.has(d.accountId)||![d.gross,d.tax,d.fee].every(finite)||d.gross<d.tax+d.fee)throw Error('Dividendo inválido')}
 for(const q of s.prices){if(!assets.has(q.assetId)||!finite(q.price)||!q.date)throw Error('Precio inválido')}
 for(const g of s.goals){if(!finite(g.target)||g.target<=0||!finite(g.allocated))throw Error('Objetivo inválido')}
 for(const b of s.budgets){if(!cats.has(b.categoryId)||!finite(b.amount))throw Error('Presupuesto inválido')}
 for(const r of s.recurrings){if(!accounts.has(r.accountId)||!cats.has(r.categoryId)||!finite(r.amount)||r.amount<=0||!Number.isInteger(r.day)||r.day<1||r.day>31)throw Error('Regla recurrente inválida')}
 return s;
}
