import {id,today,euro,amount,dateOk,goodMoney,goodPositive,esc,type AppState,type LegacyPosition,type Movement,type Account,type Payroll,type Portfolio,type Asset,type Trade,type Dividend,type PricePoint,type Goal,type Budget,type Recurring,type Category} from './models.js';
import {load,save,validateBackup} from './store.js';
import {demoState} from './demo.js';
import {holdings,nextRecurrings,transactionFingerprint,monthlyStats,netWorth} from './finance.js';
import {shell,formFor,lineChart,type Page,type UI} from './views.js';
import {readSpreadsheet} from './xlsx.js';

let state:AppState;
const ui:UI={page:'dashboard',period:'1Y',search:'',kind:'all',account:'all',theme:localStorage.getItem('mi-finanzas-theme')==='light'?'light':'dark',simInitial:10000,simMonthly:300,simRate:5,simYears:20,navOpen:false,forecastValue:0};
const root=document.getElementById('app')!;
const modal=document.createElement('dialog');modal.id='modal';modal.className='modal';document.body.appendChild(modal);
let importPending:{movements:Movement[];newCategories:Category[];duplicates:number;invalid:string[]}|null=null;
function toast(message:string,error=false){const el=document.getElementById('toast')!;el.textContent=message;el.className=error?'toast-error':'toast-success';el.classList.add('toast-visible');setTimeout(()=>el.classList.remove('toast-visible'),4100)}
function render(){document.documentElement.dataset.theme=ui.theme;root.innerHTML=shell(state,ui);}
function show(kind:string,recordId?:string){if(kind==='movement'&&!state.accounts.length){toast('Primero crea una cuenta.',true);kind='account'}
 if(['trade','quote','dividend'].includes(kind)&&!state.assets.length){toast('Primero crea una cartera y un activo.',true);kind=state.portfolios.length?'asset':'portfolio'}
 if(kind==='asset'&&!state.portfolios.length){toast('Primero crea una cartera.',true);kind='portfolio'}
 const f=formFor(state,kind,recordId);modal.innerHTML=`<div class="modal-inner"><div class="modal-header"><h2>${f.title}</h2><button class="icon-btn" data-action="close-modal" aria-label="Cerrar formulario">×</button></div>${f.html}</div>`;modal.showModal();
}
function ask(message:string){return window.confirm(message)}
function formVal(f:HTMLFormElement,n:string){return String(new FormData(f).get(n)||'').trim()}
function money(f:HTMLFormElement,n:string,positive=false){const val=amount(formVal(f,n));if(!(positive?goodPositive(val):goodMoney(val)))throw Error(`Comprueba el campo «${n}»: debe ser un número válido ${positive?'mayor que cero':'igual o mayor que cero'}.`);return val}
function day(f:HTMLFormElement,n:string,optional=false){const v=formVal(f,n);if(!v&&optional)return undefined;if(!dateOk(v))throw Error(`Fecha incorrecta: ${n}.`);return v}
function required(f:HTMLFormElement,n:string){const v=formVal(f,n);if(!v)throw Error(`Debes rellenar el campo ${n}.`);return v}
function ref<T extends {id:string}>(items:T[],name:string,value:string){if(!items.some(x=>x.id===value))throw Error(`${name} no válido.`);return value}
async function commit(modify:(s:AppState)=>void,message='Guardado correctamente.'){
 const next:AppState=structuredClone(state);modify(next);holdings(next,'9999-12-31'); // validez histórica de cantidades vendidas
 await save(next);state=next;modal.close();render();toast(message)
}
function updateList<T extends {id:string}>(arr:T[],v:T){const idx=arr.findIndex(i=>i.id===v.id);if(idx<0)arr.push(v);else arr[idx]=v}
async function saveForm(f:HTMLFormElement){
 const type=f.dataset.kind!;const oldId=f.dataset.record||'';const uid=oldId||id();const get=(n:string)=>formVal(f,n);
 await commit(s=>{
 switch(type){
 case 'movement':{
 const kind=get('kind') as Movement['kind'];if(!['income','expense','transfer'].includes(kind))throw Error('Tipo inválido');
 const acc=ref(s.accounts,'Cuenta',required(f,'accountId'));const to=get('toAccountId')||undefined;const cat=get('categoryId')||undefined;
 if(kind==='transfer'&&(!to||!s.accounts.some(a=>a.id===to)||acc===to))throw Error('Elige dos cuentas diferentes para la transferencia.');
 if(kind!=='transfer'&&cat){const c=s.categories.find(c=>c.id===cat);if(!c||c.kind!==kind)throw Error('La categoría debe corresponder al tipo de movimiento.');}
 updateList(s.movements,{id:uid,kind,date:day(f,'date')!,accountId:acc,toAccountId:kind==='transfer'?to:undefined,amount:money(f,'amount',true),categoryId:kind==='transfer'?undefined:cat,description:required(f,'description'),occurrenceKey:oldId?s.movements.find(m=>m.id===uid)?.occurrenceKey:undefined});break;
 }
 case 'account':{
 const kind=get('kind') as Account['kind'];if(!['bank','cash','broker','debt','other'].includes(kind))throw Error('Tipo de cuenta inválido');
 const balance=Number(get('openingBalance'));if(!Number.isFinite(balance)||Math.abs(balance)>=1e13||(kind==='debt'&&balance>0)||(kind!=='debt'&&balance<0))throw Error('Las deudas deben tener saldo inicial negativo o cero; las demás cuentas, positivo o cero.');updateList(s.accounts,{id:uid,name:required(f,'name'),kind,openingBalance:balance,openingDate:day(f,'openingDate')!});break;
 }
 case 'payroll':{
 const gross=money(f,'gross'),withholding=money(f,'withholding'),social=money(f,'social'),flex=money(f,'flex'),net=money(f,'net');
 if(withholding+social+flex+net>gross+0.02)throw Error('Las deducciones, la retribución flexible y el neto no pueden superar el bruto. Si hay más conceptos positivos, incorpóralos al bruto.');
 updateList(s.payrolls,{id:uid,employer:required(f,'employer'),date:day(f,'date')!,accountId:ref(s.accounts,'Cuenta',required(f,'accountId')),gross,withholding,social,flex,net,note:get('note')});break;
 }
 case 'legacy':{
 const kind=get('kind') as LegacyPosition['kind'];if(!['fund','stock','crypto'].includes(kind))throw Error('Tipo de inversión inválido');
 updateList(s.legacyPositions,{id:uid,name:required(f,'name'),kind,platform:required(f,'platform'),value:money(f,'value'),valuationDate:day(f,'valuationDate')!,note:get('note')});break;
 }
 case 'portfolio':updateList(s.portfolios,{id:uid,name:required(f,'name'),platform:required(f,'platform')});break;
 case 'asset':{
 const kind=get('kind') as Asset['kind'];if(!['stock','fund','crypto'].includes(kind))throw Error('Clase de activo no válida');
 const price=money(f,'price');const asset:Asset={id:uid,name:required(f,'name'),symbol:required(f,'symbol'),kind,portfolioId:ref(s.portfolios,'Cartera',required(f,'portfolioId')),price,priceDate:day(f,'priceDate')!};
 updateList(s.assets,asset);
 // Mantener instantáneas de valoración aunque se modifique el precio.
 if(price>0&&!s.prices.some(q=>q.assetId===uid&&q.date===asset.priceDate))s.prices.push({id:id(),assetId:uid,date:asset.priceDate,price});break;
 }
 case 'trade':{
 const kind=get('kind') as Trade['kind'];if(!['buy','sell','grant'].includes(kind))throw Error('Tipo de operación inválido');
 const accountId=kind==='grant'?undefined:ref(s.accounts,'Cuenta de efectivo',required(f,'accountId'));
 const fee=money(f,'fee');if(kind==='grant'&&fee>0)throw Error('Las entregas sin efectivo no pueden tener comisión en efectivo. Registra la comisión como gasto si existe.');
 const date=day(f,'date')!,unlockDate=day(f,'unlockDate',true);
 if(unlockDate&&unlockDate<date)throw Error('El desbloqueo no puede ser anterior a la adquisición.');
 const t:Trade={id:uid,assetId:ref(s.assets,'Activo',required(f,'assetId')),kind,date,quantity:money(f,'quantity',true),unitPrice:money(f,'unitPrice'),fee,accountId,unlockDate,note:get('note')};updateList(s.trades,t);break;
 }
 case 'quote':{
 const assetId=ref(s.assets,'Activo',required(f,'assetId'));const date=day(f,'date')!,price=money(f,'price');if(!goodPositive(price))throw Error('El precio debe ser mayor que cero');
 const old=s.prices.find(q=>q.assetId===assetId&&q.date===date);
 if(old){old.price=price}else s.prices.push({id:uid,assetId,date,price});
 const a=s.assets.find(x=>x.id===assetId)!;if(date>=a.priceDate){a.price=price;a.priceDate=date}break;
 }
 case 'dividend':{
 const gross=money(f,'gross',true),tax=money(f,'tax'),fee=money(f,'fee');if(tax+fee>gross)throw Error('Retención y comisiones no pueden superar el dividendo bruto');
 updateList(s.dividends,{id:uid,assetId:ref(s.assets,'Activo',required(f,'assetId')),accountId:ref(s.accounts,'Cuenta',required(f,'accountId')),date:day(f,'date')!,gross,tax,fee});break;
 }
 case 'goal':{
 const target=money(f,'target',true),allocated=money(f,'allocated');const deadline=day(f,'deadline')!;updateList(s.goals,{id:uid,name:required(f,'name'),target,allocated,deadline,kind:get('kind')});break;
 }
 case 'budget':{
 const categoryId=ref(s.categories,'Categoría',required(f,'categoryId'));if(s.categories.find(c=>c.id===categoryId)?.kind!=='expense')throw Error('El presupuesto requiere una categoría de gasto');
 const current=s.budgets.find(b=>b.categoryId===categoryId);updateList(s.budgets,{id:current?.id||uid,categoryId,amount:money(f,'amount')});break;
 }
 case 'recurring':{
 const kind=get('kind') as Recurring['kind'];const categoryId=ref(s.categories,'Categoría',required(f,'categoryId'));
 if(s.categories.find(c=>c.id===categoryId)?.kind!==kind)throw Error('La categoría no corresponde al tipo de recurrencia');
 const d=money(f,'day',true);if(!Number.isInteger(d)||d<1||d>31)throw Error('El día debe estar entre 1 y 31');
 updateList(s.recurrings,{id:uid,kind,accountId:ref(s.accounts,'Cuenta',required(f,'accountId')),categoryId,description:required(f,'description'),amount:money(f,'amount',true),day:d,startDate:day(f,'startDate')!,active:get('active')==='true'});break;
 }
 case 'category':{
 const kind=get('kind') as Category['kind'];if(!['income','expense'].includes(kind))throw Error('Tipo inválido');updateList(s.categories,{id:uid,name:required(f,'name'),kind});break;
 }
 default:throw Error('Formulario no reconocido');
 }
 },'Registro guardado y cálculos actualizados.');
}
async function deleteRecord(action:string,key:string){
 const conf=({ 'delete-movement':'movements','delete-payroll':'payrolls','delete-account':'accounts','delete-asset':'assets','delete-portfolio':'portfolios','delete-trade':'trades','delete-dividend':'dividends','delete-goal':'goals','delete-recurring':'recurrings','delete-category':'categories','delete-quote':'prices','delete-budget':'budgets','delete-legacy':'legacyPositions' } as Record<string,keyof AppState>)[action];
 if(!conf)return;
 const rec=(state[conf] as {id:string}[]).find(v=>v.id===key);if(!rec)return;
 if(!ask('¿Eliminar este registro? Los saldos y cálculos se actualizarán automáticamente.'))return;
 await commit(s=>{
 if(conf==='accounts'&&(s.movements.some(m=>m.accountId===key||m.toAccountId===key)||s.payrolls.some(p=>p.accountId===key)||s.trades.some(t=>t.accountId===key)||s.dividends.some(d=>d.accountId===key)||s.recurrings.some(r=>r.accountId===key)))throw Error('No puedes borrar una cuenta con operaciones asociadas. Borra o reasigna primero esas operaciones.');
 if(conf==='assets'&&(s.trades.some(t=>t.assetId===key)||s.dividends.some(d=>d.assetId===key)||s.prices.some(q=>q.assetId===key)))throw Error('No puedes borrar un activo con registros asociados.');
 if(conf==='portfolios'&&s.assets.some(a=>a.portfolioId===key))throw Error('Esta cartera contiene activos.');
 if(conf==='categories'&&(s.movements.some(m=>m.categoryId===key)||s.budgets.some(b=>b.categoryId===key)||s.recurrings.some(r=>r.categoryId===key)))throw Error('Esta categoría tiene movimientos, presupuestos o recurrencias.');
 (s[conf] as {id:string}[]).splice((s[conf] as {id:string}[]).findIndex(x=>x.id===key),1);
 },'Registro eliminado.');
}
function csvCell(x:unknown){return `"${String(x??'').replaceAll('"','""')}"`}
function csvText(rows:(string|number)[][]){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n')+'\r\n'}
function download(name:string,contents:string,mime:string){const blob=new Blob([contents],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backup(){download('mi-finanzas-copia-'+today()+'.json',JSON.stringify(state,null,2),'application/json;charset=utf-8');toast('Copia JSON descargada. Guárdala en un lugar privado.');}
function exportTransactions(){const rows:(string|number)[][]=[['fecha','tipo','cuenta','importe','categoria','concepto','destino']];for(const m of state.movements){rows.push([m.date,m.kind,state.accounts.find(a=>a.id===m.accountId)?.name||'',m.amount,state.categories.find(c=>c.id===m.categoryId)?.name||'',m.description,state.accounts.find(a=>a.id===m.toAccountId)?.name||''])}download('mi-finanzas-movimientos-'+today()+'.csv',csvText(rows),'text/csv;charset=utf-8')}
function exportReport(){const dates=[...state.accounts.map(a=>a.openingDate),...state.movements.map(m=>m.date),...state.trades.map(t=>t.date),...state.payrolls.map(p=>p.date)];const monthly=monthlyStats(state,dates.sort()[0]||today(),today());const rows:(string|number)[][]=[['mes','ingresos','gastos','ahorro','efectivo','inversiones','patrimonio_neto']];for(const m of monthly)rows.push([m.month,m.income,m.expenses,m.saving,m.cash,m.invested,m.total]);download('mi-finanzas-informe-'+today()+'.csv',csvText(rows),'text/csv;charset=utf-8')}
function parseCSV(content:string):string[][]{
 const first=content.split(/\r?\n/)[0];const separators=[';',',','\t'];const counts=separators.map(s=>first.split(s).length);const delimiter=separators[counts.indexOf(Math.max(...counts))];
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 content=content.replace(/^\uFEFF/,'');
 for(let i=0;i<content.length;i++){
  const ch=content[i];if(ch==='"'){if(quoted&&content[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(ch===delimiter&&!quoted){row.push(cell.trim());cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&content[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}else cell+=ch;
 }
 if(quoted)throw Error('El CSV tiene comillas sin cerrar.');row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);return rows;
}
function normalizeHeading(t:string){return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s_\-]+/g,'').replace(/\uFEFF/g,'')}
function parseImportDate(t:string):string{
 if(/^\d{4}-\d{2}-\d{2}$/.test(t)&&dateOk(t))return t;
 if(/^\d{2}\/\d{2}\/\d{4}$/.test(t)){const [d,m,y]=t.split('/');const v=`${y}-${m}-${d}`;if(dateOk(v))return v}
 if(/^\d+(\.\d+)?$/.test(t)&&Number(t)>15000&&Number(t)<100000){const dt=new Date(Date.UTC(1899,11,30)+Math.floor(Number(t))*86400000);return dt.toISOString().slice(0,10)}
 throw Error('Fecha inválida: '+t);
}
function prepareImport(rows:string[][]){
 if(rows.length<2)throw Error('El archivo no tiene filas de operaciones.');if(rows.length>25001)throw Error('Límite: 25.000 filas por importación.');
 const headers=rows[0].map(normalizeHeading);
 const col=(...names:string[])=>{const i=headers.findIndex(h=>names.includes(h));if(i<0)throw Error(`Falta columna: ${names[0]}. Consulta la plantilla CSV.`);return i};
 const dateIdx=col('fecha','date'),kindIdx=col('tipo','type','clase'),accIdx=col('cuenta','account'),amountIdx=col('importe','cantidad','amount'),conceptIdx=col('concepto','descripcion','description');
 const catIdx=headers.findIndex(h=>['categoria','category'].includes(h)),toIdx=headers.findIndex(h=>['destino','cuentadestino','toaccount'].includes(h));
 const newCats:Category[]=[],pending:Movement[]=[],invalid:string[]=[];let duplicates=0;
 const seen=new Set(state.movements.map(transactionFingerprint));
 for(let i=1;i<rows.length;i++){
  try{
   const row=rows[i];const date=parseImportDate((row[dateIdx]||'').trim());let kind=(row[kindIdx]||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
   kind=({gasto:'expense',ingreso:'income',transferencia:'transfer',traspaso:'transfer',expense:'expense',income:'income',transfer:'transfer'} as Record<string,string>)[kind]||'';
   if(!kind)throw Error('Tipo desconocido');
   const account=state.accounts.find(a=>a.name.trim().toLowerCase()===(row[accIdx]||'').trim().toLowerCase());if(!account)throw Error('La cuenta no existe: '+(row[accIdx]||''));
   const raw=(row[amountIdx]||'').trim();const v=amount(raw.replace(/^\+|^−|^-/,'').replace(/[€]/g,''));if(!goodPositive(v))throw Error('Importe no válido');
   const concept=(row[conceptIdx]||'').trim();if(!concept||concept.length>120)throw Error('Concepto obligatorio o demasiado largo');
   const categoryName=catIdx>=0?(row[catIdx]||'').trim():'';
   let categoryId:string|undefined;
   if(kind!=='transfer'&&categoryName){let cat=[...state.categories,...newCats].find(c=>c.kind===kind&&c.name.toLowerCase()===categoryName.toLowerCase());if(!cat){cat={id:id(),name:categoryName.slice(0,60),kind:kind as Category['kind']};newCats.push(cat)}categoryId=cat.id}
   let toAccountId:string|undefined;
   if(kind==='transfer'){const to=state.accounts.find(a=>a.name.toLowerCase()===(row[toIdx]||'').trim().toLowerCase());if(!to||to.id===account.id)throw Error('Cuenta de destino incorrecta');toAccountId=to.id}
   const m:Movement={id:id(),date,kind:kind as Movement['kind'],accountId:account.id,toAccountId,amount:v,categoryId,description:concept};const fp=transactionFingerprint(m);
   if(seen.has(fp)){duplicates++;continue}pending.push(m);seen.add(fp);
  }catch(e){if(invalid.length<20)invalid.push(`Fila ${i+1}: ${(e as Error).message}`)}
 }
 importPending={movements:pending,newCategories:newCats,duplicates,invalid};
 modal.innerHTML=`<div class="modal-inner"><div class="modal-header"><h2>Revisar importación</h2><button class="icon-btn" data-action="close-modal">×</button></div><div class="import-summary"><div><strong>${pending.length}</strong><small>Nuevas operaciones</small></div><div><strong>${duplicates}</strong><small>Duplicados omitidos</small></div><div><strong>${invalid.length}</strong><small>Errores detectados${invalid.length===20?' (máx. 20 mostrados)':''}</small></div></div>${invalid.length?`<div class="import-errors">${invalid.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}<p class="muted">Las operaciones nuevas se añadirán a tus cuentas locales. No se duplicarán las que ya existen con los mismos datos.</p><div class="modal-footer"><button class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="confirm-import" ${pending.length?'':'disabled'}>Importar ${pending.length} movimientos</button></div></div>`;modal.showModal();
}
async function importFile(file:File){if(file.size>12*1024*1024)throw Error('El archivo supera los 12 MB.');let rows:string[][];
 if(/\.xlsx$/i.test(file.name))rows=await readSpreadsheet(file);else{const content=await file.text();rows=parseCSV(content)}prepareImport(rows);
}
async function restoreFile(file:File){if(file.size>10*1024*1024)throw Error('Copia demasiado grande (máximo 10 MB).');const parsed=validateBackup(JSON.parse(await file.text()));holdings(parsed,'9999-12-31');
 if(!ask(`Vas a REEMPLAZAR todos tus datos de este navegador por una copia con ${parsed.accounts.length} cuentas y ${parsed.trades.length+parsed.movements.length} operaciones. ¿Continuar?`))return;
 await save(parsed);state=parsed;render();toast('Copia restaurada correctamente.');
}
async function runAction(action:string,key:string){
 if(action==='open'){show(key);return}if(action.startsWith('open-')){show(action.slice(5));return}
 if(action==='close-modal'){modal.close();return}
 if(action==='view-asset'){
  const asset=state.assets.find(a=>a.id===key);if(!asset)throw Error('Activo no encontrado');
  const pricePoints=new Map<string,number>();
  for(const t of state.trades.filter(t=>t.assetId===key).sort((a,b)=>a.date.localeCompare(b.date)))pricePoints.set(t.date,t.unitPrice);
  for(const q of state.prices.filter(q=>q.assetId===key).sort((a,b)=>a.date.localeCompare(b.date)))pricePoints.set(q.date,q.price);
  pricePoints.set(asset.priceDate,asset.price);
  const points=[...pricePoints.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,value])=>({label:date,value}));
  const h=holdings(state).find(h=>h.asset.id===key)!;
  modal.innerHTML=`<div class="modal-inner"><div class="modal-header"><h2>Histórico · ${esc(asset.symbol)}</h2><button class="icon-btn" data-action="close-modal">×</button></div><p class="muted">Valoraciones en euros introducidas manualmente. Los precios de compra se muestran como referencia cuando no hay otra cotización del día.</p>${lineChart(points.map(x=>({label:x.label,value:x.value})),220)}<div class="kv-list"><div class="key-value"><span>Participaciones actuales</span><strong>${h.quantity}</strong></div><div class="key-value"><span>Precio medio de adquisición</span><strong>${h.quantity?euro(h.cost/h.quantity):'—'}</strong></div><div class="key-value"><span>Coste pendiente</span><strong>${euro(h.cost)}</strong></div><div class="key-value"><span>Resultado realizado</span><strong>${euro(h.realized)}</strong></div><div class="key-value"><span>Resultado no realizado</span><strong>${euro(h.unrealized)}</strong></div></div><h3 class="mini-heading">Cotizaciones de referencia</h3><div class="history-rows">${points.slice(-40).reverse().map(p=>`<div><span>${esc(p.label)}</span><strong>${euro(p.value)}</strong></div>`).join('')}</div><div class="modal-footer"><button class="btn btn-soft" data-action="close-modal">Cerrar</button></div></div>`;
  modal.showModal();return;
 }
 if(action==='navigate'){ui.page=key as Page;ui.navOpen=false;ui.search='';render();window.scrollTo({top:0,behavior:'instant'});return}
 if(action==='period'){ui.period=key;render();return}
 if(action==='theme'){ui.theme=ui.theme==='dark'?'light':'dark';localStorage.setItem('mi-finanzas-theme',ui.theme);render();return}
 if(action==='toggle-nav'){ui.navOpen=!ui.navOpen;render();return}
 if(action.startsWith('edit-')){show(action.slice(5),key);return}
 if(action.startsWith('delete-')){await deleteRecord(action,key);return}
 if(action==='backup'){backup();return}if(action==='export-movements'){exportTransactions();return}if(action==='export-report'){exportReport();return}
 if(action==='download-template'){download('plantilla-movimientos.csv',csvText([['fecha','tipo','cuenta','importe','categoria','concepto','destino'],['2026-10-02','gasto','Nombre exacto de tu cuenta',25.5,'Alimentación','Compra de ejemplo','']]),'text/csv;charset=utf-8');return}
 if(action==='clear-demo'||action==='clear-all'){
  if(!ask('Esta operación BORRARÁ todas las cuentas, movimientos, carteras, nóminas e inversiones de este navegador. ¿Seguro? Se recomienda descargar antes una copia JSON.'))return;
  const e=await import('./models.js');await save(e.emptyState());state=e.emptyState();ui.page='dashboard';render();toast('Datos borrados. Ya puedes comenzar con tus cuentas.');return;
 }
 if(action==='simulate'){
  const v=(k:string)=>Number((document.getElementById(k) as HTMLInputElement).value);
  const a=v('sim-initial'),b=v('sim-monthly'),c=v('sim-rate'),d=v('sim-years');if(![a,b,c,d].every(Number.isFinite)||a<0||b<0||c<=-100||c>1000||!Number.isInteger(d)||d<1||d>80)throw Error('Comprueba capital, aportación, rentabilidad (mayor que −100 %) y años (1–80).');
  [ui.simInitial,ui.simMonthly,ui.simRate,ui.simYears]=[a,b,c,d];render();return;
 }
 if(action==='confirm-import'){
  if(!importPending)return;const p=importPending;
  await commit(s=>{s.categories.push(...p.newCategories);s.movements.push(...p.movements)},`Importadas ${p.movements.length} operaciones. ${p.duplicates} duplicados omitidos.`);importPending=null;return;
 }
 if(action==='manage-categories'){show('category');return}
 if(action==='manage-quotes'){ui.page='investments';render();return}
}
window.addEventListener('offline',()=>toast('Sin conexión: puedes seguir usando tus datos locales.'));
root.addEventListener('click',async e=>{const target=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');if(!target)return;e.preventDefault();try{await runAction(target.dataset.action!,target.dataset.id||'')}catch(error){toast((error as Error).message,true)}});
modal.addEventListener('click',async e=>{const target=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');if(!target)return;e.preventDefault();try{await runAction(target.dataset.action!,target.dataset.id||'')}catch(error){toast((error as Error).message,true)}});
modal.addEventListener('submit',async e=>{e.preventDefault();const f=e.target as HTMLFormElement;const submit=f.querySelector<HTMLButtonElement>('[type=submit]');if(submit)submit.disabled=true;try{await saveForm(f)}catch(error){toast((error as Error).message,true)}finally{if(submit)submit.disabled=false}});
root.addEventListener('input',e=>{const el=e.target as HTMLInputElement;if(el.id==='search'){const pos=el.selectionStart??el.value.length;ui.search=el.value;render();const f=document.getElementById('search') as HTMLInputElement;if(f){f.focus();f.setSelectionRange(pos,pos)}}});
root.addEventListener('change',async e=>{const el=e.target as HTMLInputElement|HTMLSelectElement;
 try{
  if(el.id==='filter-kind'){ui.kind=el.value;render()}
  if(el.id==='filter-account'){ui.account=el.value;render()}
  if(el.id==='csv-file'||el.id==='restore-file'){const file=(el as HTMLInputElement).files?.[0];if(!file)return;if(el.id==='csv-file')await importFile(file);else await restoreFile(file);el.value=''}
 }catch(error){toast((error as Error).message,true);(el as HTMLInputElement).value=''}});
modal.addEventListener('change',e=>{
 const el=e.target as HTMLSelectElement;const f=el.closest<HTMLFormElement>('form');
 if(!f||el.name!=='kind')return;
 if(['movement','recurring'].includes(f.dataset.kind||'')){
  const cat=f.querySelector<HTMLSelectElement>('select[name=categoryId]');if(!cat)return;
  const old=cat.value;const prefix=f.dataset.kind==='movement'?'<option value="">Sin categoría</option>':'';
  cat.innerHTML=prefix+state.categories.filter(c=>c.kind===el.value).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  if(state.categories.some(c=>c.id===old&&c.kind===el.value))cat.value=old;
 }
 if(f.dataset.kind==='trade'){
  const acc=f.querySelector<HTMLSelectElement>('select[name=accountId]');const fee=f.querySelector<HTMLInputElement>('input[name=fee]');
  if(acc)acc.disabled=el.value==='grant';if(fee&&el.value==='grant')fee.value='0';
 }
});
modal.addEventListener('cancel',()=>importPending=null);
modal.addEventListener('click',e=>{if(e.target===modal){modal.close();importPending=null}});
async function start(){try{
 if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
 const loaded=await load();state=loaded?validateBackup(loaded):demoState();
 const generated=state.demo?[]:nextRecurrings(state);if(generated.length)state.movements.push(...generated);
 if(!loaded||generated.length)await save(state);render();if(generated.length)toast(`${generated.length} movimientos recurrentes registrados.`);
 }catch(e){root.innerHTML=`<div class="fatal"><h1>No se pudo abrir Mi Finanzas</h1><p>${esc((e as Error).message)}</p><p>Prueba con un navegador moderno o abre la web mediante un servidor local. No hemos eliminado tus datos.</p><button onclick="location.reload()">Reintentar</button></div>`}}
start();
