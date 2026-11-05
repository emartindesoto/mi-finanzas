import {emptyState,type AppState,monthOf,today} from './models.js';
const id=(n:string)=>n;
export function demoState():AppState{
 const s=emptyState();s.demo=true;
 s.accounts=[{id:id('bank'),name:'Cuenta principal · Ejemplo',kind:'bank',openingBalance:12500,openingDate:'2025-01-01'},{id:id('savings'),name:'Cuenta ahorro · Ejemplo',kind:'bank',openingBalance:7500,openingDate:'2025-01-01'},{id:id('broker'),name:'Efectivo bróker · Ejemplo',kind:'broker',openingBalance:75000,openingDate:'2025-01-01'}];
 const expenses=['Vivienda','Alimentación','Transporte y gasolina','Vehículos y mantenimiento','Seguros','Universidad','Deporte','Ocio','Compras','Suscripciones','Otros'];
 const incomes=['Otros ingresos','Pagas extras','Regalos'];
 s.categories=[...expenses.map((name,i)=>({id:`cat-e${i}`,name,kind:'expense' as const})),...incomes.map((name,i)=>({id:`cat-i${i}`,name,kind:'income' as const}))];
 s.portfolios=[{id:'myinvestor',name:'Indexados · Ejemplo',platform:'MyInvestor'},{id:'acciones',name:'Acciones · Ejemplo',platform:'Bróker de ejemplo'},{id:'criptos',name:'Cripto · Ejemplo',platform:'Autocustodia'}];
 s.assets=[
 {id:'world',portfolioId:'myinvestor',name:'Vanguard Global Stock Index',symbol:'Vanguard Global',kind:'fund',price:350,priceDate:today()},
 {id:'em',portfolioId:'myinvestor',name:'Vanguard Emerging Markets',symbol:'Emergentes',kind:'fund',price:235,priceDate:today()},
 {id:'small',portfolioId:'myinvestor',name:'Vanguard Global Small-Cap',symbol:'Small Caps',kind:'fund',price:180,priceDate:today()},
 {id:'googl',portfolioId:'acciones',name:'Alphabet',symbol:'GOOGL',kind:'stock',price:250,priceDate:today()},
 {id:'repsol',portfolioId:'acciones',name:'Repsol · Retribución flexible',symbol:'REP',kind:'stock',price:17.2,priceDate:today()},
 {id:'realty',portfolioId:'acciones',name:'Realty Income',symbol:'O',kind:'stock',price:52.8,priceDate:today()},
 {id:'btc',portfolioId:'criptos',name:'Bitcoin',symbol:'BTC',kind:'crypto',price:85000,priceDate:today()}
 ];
 const t=(assetId:string,date:string,quantity:number,unitPrice:number,kind:'buy'|'grant'='buy',accountId='broker',unlockDate?:string)=>s.trades.push({id:`trade-${s.trades.length}`,assetId,date,quantity,unitPrice,kind,accountId:kind==='grant'?undefined:accountId,fee:kind==='grant'?0:1,unlockDate});
 t('world','2025-02-03',70,290);t('world','2025-06-10',60,312);t('world','2026-02-12',20,325);
 t('em','2025-04-04',27,210);t('small','2025-03-10',35,160);
 t('googl','2025-02-03',15,190);t('realty','2025-07-07',20,57);t('btc','2026-01-13',0.022,67000);
 t('repsol','2025-01-15',70,14.1,'grant','broker','2028-01-15');t('repsol','2026-01-15',75,15.4,'grant','broker','2029-01-15');
 const quote=(assetId:string,dates:[string,number][])=>dates.forEach(([date,price])=>s.prices.push({id:`quote-${s.prices.length}`,assetId,date,price}));
 quote('world',[['2025-02-03',290],['2025-07-01',310],['2026-01-31',325],['2026-06-30',335]]);
 quote('googl',[['2025-02-03',190],['2025-11-30',215],['2026-06-30',235]]);
 quote('repsol',[['2025-01-15',14.1],['2026-01-15',15.4],['2026-07-01',16.5]]);
 const salaries=['2026-01-28','2026-02-27','2026-03-27','2026-04-28','2026-05-28','2026-06-26','2026-07-28','2026-08-28','2026-09-28','2026-10-28','2026-11-03'];
 for(const day of salaries.filter(d=>d<=today()))s.payrolls.push({id:'pay'+day,date:day,employer:'Empresa de ejemplo',accountId:'bank',gross:3950,withholding:740,social:260,flex:950,net:2000});
 for(const month of ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']){
  if(month>monthOf(today()))break;
  const types:[number,number,string][]=[[6,510,'Alquiler / vivienda'],[1,320,'Supermercado'],[2,140,'Gasolina'],[5,90,'Material universitario'],[6,85,'Deporte'],[7,190,'Restaurante y ocio'],[9,35,'Servicios online']];
  for(const [cat,money,description] of types)s.movements.push({id:`exp-${month}-${cat}-${s.movements.length}`,date:month==='2026-11'?'2026-11-02':month+'-06',kind:'expense',accountId:'bank',categoryId:`cat-e${cat}`,amount:money+(cat===1?((Number(month.slice(-2))%3)-1)*25:0),description});
 }
 s.movements.push({id:'tr1',date:'2026-03-05',kind:'transfer',accountId:'bank',toAccountId:'savings',amount:1300,description:'Traspaso entre cuentas'});
 for(const day of ['2026-03-15','2026-06-15','2026-09-15']){if(day<=today())s.dividends.push({id:'div'+day,assetId:'repsol',accountId:'broker',date:day,gross:75,tax:14.25,fee:0})}
 s.goals=[{id:'goal1',name:'Entrada para una vivienda',target:25000,allocated:8500,deadline:'2028-12-31',kind:'vivienda'},{id:'goal2',name:'Fondo de emergencia',target:12000,allocated:7500,deadline:'2027-12-31',kind:'seguridad'}];
 s.budgets=[{id:'bud1',categoryId:'cat-e1',amount:400},{id:'bud2',categoryId:'cat-e7',amount:250},{id:'bud3',categoryId:'cat-e2',amount:200}];
 return s;
}
