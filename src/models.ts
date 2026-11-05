export type ID=string;
export type CashKind='income'|'expense'|'transfer';
export type AssetKind='fund'|'stock'|'crypto';
export type TradeKind='buy'|'sell'|'grant';
export type AccountKind='bank'|'cash'|'broker'|'debt'|'other';
export type CategoryKind='income'|'expense';
export interface Account {id:ID;name:string;kind:AccountKind;openingBalance:number;openingDate:string;note?:string}
export interface Category {id:ID;name:string;kind:CategoryKind;color?:string}
export interface Movement {id:ID;date:string;kind:CashKind;accountId:ID;toAccountId?:ID;amount:number;categoryId?:ID;description:string;occurrenceKey?:string}
export interface Payroll {id:ID;date:string;employer:string;accountId:ID;gross:number;withholding:number;social:number;flex:number;net:number;note?:string}
export interface Portfolio {id:ID;name:string;platform:string}
export interface Asset {id:ID;portfolioId:ID;name:string;symbol:string;kind:AssetKind;price:number;priceDate:string}
export interface Trade {id:ID;assetId:ID;accountId?:ID;date:string;kind:TradeKind;quantity:number;unitPrice:number;fee:number;unlockDate?:string;note?:string}
export interface Dividend {id:ID;assetId:ID;accountId:ID;date:string;gross:number;tax:number;fee:number}
export interface PricePoint {id:ID;assetId:ID;date:string;price:number}
export interface Goal {id:ID;name:string;target:number;allocated:number;deadline:string;kind:string}
export interface Budget {id:ID;categoryId:ID;amount:number}
export interface Recurring {id:ID;kind:'income'|'expense';accountId:ID;categoryId:ID;description:string;amount:number;day:number;startDate:string;active:boolean}
export interface WealthSnapshot {id:ID;date:string;total:number;source:string;note?:string;reconciliationGap?:number}
export interface LegacyPosition {id:ID;name:string;kind:AssetKind;platform:string;value:number;valuationDate:string;note?:string}
export interface AppState {version:number;demo:boolean;snapshots:WealthSnapshot[];legacyPositions:LegacyPosition[];accounts:Account[];categories:Category[];movements:Movement[];payrolls:Payroll[];portfolios:Portfolio[];assets:Asset[];trades:Trade[];dividends:Dividend[];prices:PricePoint[];goals:Goal[];budgets:Budget[];recurrings:Recurring[]}
export const VERSION=1;
export const emptyState=():AppState=>({version:VERSION,demo:false,snapshots:[],legacyPositions:[],accounts:[],categories:[],movements:[],payrolls:[],portfolios:[],assets:[],trades:[],dividends:[],prices:[],goals:[],budgets:[],recurrings:[]});
export const id=():ID=>crypto.randomUUID();
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'});
export const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
export const number=(n:number,digits=2)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:digits}).format(Number.isFinite(n)?n:0);
export const percent=(n:number)=>`${number(n,2)} %`;
export const dateES=(iso:string)=>iso?iso.split('-').reverse().join('/'):'—';
export const sum=(xs:number[])=>xs.reduce((a,b)=>a+b,0);
export const esc=(s:unknown)=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const amount=(x:unknown)=>Number(String(x??'').trim().replace(/\s/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));
export const goodMoney=(n:number)=>Number.isFinite(n)&&n>=0&&n<1e13;
export const goodPositive=(n:number)=>goodMoney(n)&&n>0;
export function dateOk(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)===v}
export function monthOf(d:string){return d.slice(0,7)}
export const iconFor=(kind:string)=>({bank:'🏦',cash:'💶',broker:'◈',other:'▤',fund:'◈',stock:'▥',crypto:'₿'} as Record<string,string>)[kind]||'◈';
