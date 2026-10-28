import {useEffect,useMemo,useState} from "react";
import {Download,RefreshCw,CalendarRange} from "lucide-react";

const ROOT="https://xahydzcmpikbioeyvwst.supabase.co/functions/v1";
const EXCLUDED=new Set(["1593509388682189","2220129438533853","1160571526431916"]);
const EXCLUDE_PARAM=[...EXCLUDED].join(",");
const STORAGE_PREFIX="trackup_finance_period_v1_";
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const numeric=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v);
const dollarRate=(day:string)=>day==="2026-10-27"||day==="2026-10-28"?5.82:5.5;
const shiftDay=(day:string,n:number)=>{const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const localDay=()=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Porto_Velho",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());return parts.find(p=>p.type==="year")?.value+"-"+parts.find(p=>p.type==="month")?.value+"-"+parts.find(p=>p.type==="day")?.value};
const displayDay=(day:string)=>day.split("-").reverse().join("/");
type DayRow={date:string;orders:number;income:number;usd:number;brl:number;spend:number;balance:number};
export type PeriodFinancialTotal={start:string;end:string;income:number;spend:number;balance:number|null;orders:number;partial:boolean};
type Report=PeriodFinancialTotal&{rows:DayRow[];usd:number;fetchedAt:number;cached?:boolean};
const readCache=(start:string,end:string):Report|null=>{
  if(typeof window==="undefined")return null;
  try{
    const raw=localStorage.getItem(STORAGE_PREFIX+start+"_"+end);
    if(!raw)return null;
    const report=JSON.parse(raw) as Report;
    if(report.start!==start||report.end!==end||!Number.isFinite(report.fetchedAt)||Date.now()-report.fetchedAt>24*3600000||!Array.isArray(report.rows))return null;
    return {...report,cached:true};
  }catch{return null}
};
const saveCache=(report:Report)=>{if(report.partial)return;try{localStorage.setItem(STORAGE_PREFIX+report.start+"_"+report.end,JSON.stringify({...report,cached:false}))}catch{}};
export function clearFinancialPeriodCache(){try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(STORAGE_PREFIX))localStorage.removeItem(key)}}catch{}}
export function FinancialPeriodPanel({dashboardKey,onResult}:{dashboardKey:string;onResult:(v:PeriodFinancialTotal|null)=>void}){
 const today=localDay();
 const [from,setFrom]=useState(()=>shiftDay(today,-6));
 const [to,setTo]=useState(today);
 const [applied,setApplied]=useState(()=>({start:shiftDay(today,-6),end:today}));
 const [report,setReport]=useState<Report|null>(()=>readCache(shiftDay(today,-6),today));
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);
 const duration=useMemo(()=>Math.round((Date.parse(applied.end+"T12:00:00Z")-Date.parse(applied.start+"T12:00:00Z"))/86400000)+1,[applied]);
 const queryValid=(start:string,end:string)=>{
   if(!start||!end||start>end||end>localDay())return "Escolha duas datas válidas, sem ultrapassar hoje.";
   const days=Math.round((Date.parse(end+"T12:00:00Z")-Date.parse(start+"T12:00:00Z"))/86400000)+1;
   if(days<1||days>90)return "O período deve ter no máximo 90 dias.";
   return "";
 };
 const submit=()=>{const problem=queryValid(from,to);if(problem){setError(problem);return}setError("");setApplied({start:from,end:to});setRefresh(v=>v+1)};
 const preset=(days:number)=>{const end=localDay(),start=shiftDay(end,-days+1);setFrom(start);setTo(end);setApplied({start,end});setRefresh(v=>v+1);setError("")};
 useEffect(()=>{
   const cached=readCache(applied.start,applied.end);setReport(cached);setError("");
   let alive=true;let timer=0;
   const staleAfter=applied.end===localDay()?60000:10*60000;
   const load=async(force=false)=>{
     if(!alive)return;
     const previous=readCache(applied.start,applied.end);
     if(!force&&previous&&Date.now()-previous.fetchedAt<staleAfter){setReport(previous);setLoading(false);return}
     setLoading(true);
     try{
       const headers={"x-dashboard-key":dashboardKey};
       const salesUrl=ROOT+"/tracking-daily-revenue?"+new URLSearchParams({start:applied.start,end:applied.end});
       const adUrl=ROOT+"/meta-spend-summary?"+new URLSearchParams({date:applied.end,range:"custom",start:applied.start,end:applied.end,daily:"1",account_id:"all",exclude:EXCLUDE_PARAM});
       const [saleResponse,adResponse]=await Promise.all([fetch(salesUrl,{headers,cache:"no-store"}),fetch(adUrl,{headers,cache:"no-store"})]);
       const [sales,ads]=await Promise.all([saleResponse.json(),adResponse.json()]);
       if(!saleResponse.ok||!sales.ok||!Array.isArray(sales.days))throw Error(sales.error||"Não foi possível consultar as vendas deste período.");
       if(!adResponse.ok||!ads.ok||!ads.daily||!Array.isArray(ads.accounts))throw Error(ads.error||"Não foi possível consultar os gastos por dia.");
       const accounts=ads.accounts.filter((account:{account_id:string})=>!EXCLUDED.has(String(account.account_id)));
       const unknown=accounts.some((account:{currency:string})=>!["BRL","USD"].includes(account.currency));
       const partial=Boolean(ads.partial)||Boolean(ads.errors?.length)||unknown;
       const rows:DayRow[]=sales.days.map((sale:{date:string;approved:number;revenue_cents:number})=>{
         let usd=0,brl=0;
         for(const account of accounts){
           const amount=Number(account.daily_spend?.[sale.date]||0);
           if(account.currency==="USD")usd+=amount;
           if(account.currency==="BRL")brl+=amount;
         }
         usd=Math.round(usd*100)/100;brl=Math.round(brl*100)/100;
         const spend=Math.round((usd*dollarRate(sale.date)+brl)*100)/100;
         const income=Number(sale.revenue_cents||0)/100;
         return {date:sale.date,orders:Number(sale.approved||0),income,usd,brl,spend,balance:Math.round((income-spend)*100)/100};
       });
       const income=Math.round(rows.reduce((sum,row)=>sum+row.income,0)*100)/100;
       const spend=Math.round(rows.reduce((sum,row)=>sum+row.spend,0)*100)/100;
       const usd=Math.round(rows.reduce((sum,row)=>sum+row.usd,0)*100)/100;
       const orders=rows.reduce((sum,row)=>sum+row.orders,0);
       const next:Report={start:applied.start,end:applied.end,rows,income,spend,usd,orders,partial,balance:partial?null:Math.round((income-spend)*100)/100,fetchedAt:Date.now(),cached:false};
       if(alive){setReport(next);setError("");saveCache(next)}
     }catch(e){if(alive){setReport(old=>old?.start===applied.start&&old.end===applied.end?{...old,cached:true}:null);setError(e instanceof Error?e.message:"Erro na consulta do período")}}
     finally{if(alive)setLoading(false)}
   };
   void load(refresh>0);
   timer=window.setInterval(()=>{void load(true)},applied.end===localDay()?15000:600000);
   return()=>{alive=false;window.clearInterval(timer)}
 },[dashboardKey,applied,refresh]);
 const validReport=report?.start===applied.start&&report.end===applied.end?report:null;
 useEffect(()=>{onResult(validReport?{start:validReport.start,end:validReport.end,income:validReport.income,spend:validReport.spend,balance:validReport.balance,orders:validReport.orders,partial:validReport.partial}:null)},[validReport,onResult]);
 const download=()=>{
   if(!validReport)return;
   const lines=[["Data","Vendas aprovadas","Faturamento R$","Anuncios USD","Anuncios BRL","Gasto convertido R$","Resultado parcial R$"],...validReport.rows.map(r=>[displayDay(r.date),String(r.orders),r.income.toFixed(2),r.usd.toFixed(2),r.brl.toFixed(2),r.spend.toFixed(2),validReport.partial?"":r.balance.toFixed(2)])];
   const csv="\uFEFF"+lines.map(row=>row.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(";")).join("\r\n");
   const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
   const link=document.createElement("a");link.href=url;link.download="trackup-fechamento-"+applied.start+"-a-"+applied.end+".csv";link.click();URL.revokeObjectURL(url);
 };
 return <section className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Fechamento financeiro por período">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="text-lg font-extrabold text-slate-950">Fechamento por período</h2><p className="text-xs text-slate-500">Escolha duas datas para comparar receitas, despesas com anúncios e resultado operacional.</p></div>
     <div className="flex items-center gap-2">
       <button type="button" onClick={()=>setRefresh(v=>v+1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Atualizar</button>
       <button type="button" onClick={download} disabled={!validReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50"><Download className="h-4 w-4"/>CSV</button>
     </div>
   </div>
   <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
     <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-600">Data inicial<input type="date" aria-label="Data inicial do fechamento" max={today} value={from} onChange={e=>setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"/></label>
     <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-600">Data final<input type="date" aria-label="Data final do fechamento" max={today} value={to} onChange={e=>setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"/></label>
     <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><CalendarRange className="h-4 w-4"/>Consultar período</button>
     <div className="flex flex-wrap gap-1">{[7,14,30].map(d=><button key={d} type="button" onClick={()=>preset(d)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">{d} dias</button>)}</div>
   </div>
   <p className="text-xs font-medium text-slate-500">{displayDay(applied.start)} a {displayDay(applied.end)} · {duration} {duration===1?"dia":"dias"} {loading?"· Atualizando dados…":validReport?.cached?"· Dados salvos":"· Consulta concluída"}</p>
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}{validReport?" · Últimos dados salvos exibidos.":""}</p>}
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-900">Receita aprovada</p><p className="mt-2 text-2xl font-black tabular-nums text-emerald-900">{validReport?money(validReport.income):"—"}</p><p className="mt-1 text-xs text-emerald-800">{validReport?validReport.orders+" vendas aprovadas":"Vega/Appmax"}</p></div>
     <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-600">Despesas Meta Ads</p><p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{validReport?money(validReport.spend):"—"}</p><p className="mt-1 text-xs text-slate-500">{validReport?"US$ "+numeric(validReport.usd)+" convertido por dia":"Sem as contas excluídas"}</p></div>
     <div className={`rounded-xl border p-4 ${validReport?.balance===null||!validReport?"border-slate-200 bg-slate-50":validReport.balance>=0?"border-emerald-200 bg-emerald-50":"border-rose-200 bg-rose-50"}`}><p className="text-xs font-bold text-slate-600">Resultado após anúncios</p><p className={`mt-2 text-2xl font-black tabular-nums ${!validReport||validReport.balance===null?"text-slate-600":validReport.balance>=0?"text-emerald-800":"text-rose-700"}`}>{validReport?.balance==null?"—":money(validReport.balance)}</p><p className="mt-1 text-xs text-slate-500">Antes de taxas e retiradas</p></div>
     <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">ROAS operacional</p><p className="mt-2 text-2xl font-black tabular-nums">{validReport&&!validReport.partial&&validReport.spend>0?numeric(validReport.income/validReport.spend)+"x":"—"}</p><p className="mt-1 text-xs text-slate-500">Receita dividida pelo investimento</p></div>
   </div>
   {validReport?.partial&&<p role="alert" className="text-xs font-semibold text-amber-700">Consulta parcial da Meta. O resultado e o ROAS ficam indisponíveis para evitar um saldo incorreto.</p>}
   {validReport&&<div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200">
     <table className="w-full min-w-[690px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3 text-right">Vendas</th><th className="px-3 py-3 text-right">Receitas</th><th className="px-3 py-3 text-right">Anúncios</th><th className="px-3 py-3 text-right">Resultado</th></tr></thead>
     <tbody className="divide-y divide-slate-100">{validReport.rows.map(row=><tr key={row.date}><td className="whitespace-nowrap px-3 py-3 font-semibold">{displayDay(row.date)}</td><td className="px-3 py-3 text-right tabular-nums">{row.orders}</td><td className="px-3 py-3 text-right tabular-nums">{money(row.income)}</td><td className="px-3 py-3 text-right tabular-nums">{money(row.spend)}</td><td className={`px-3 py-3 text-right font-bold tabular-nums ${row.balance<0?"text-rose-700":"text-emerald-700"}`}>{validReport.partial?"—":money(row.balance)}</td></tr>)}</tbody>
     <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-extrabold"><tr><td className="px-3 py-3">Total</td><td className="px-3 py-3 text-right">{validReport.orders}</td><td className="px-3 py-3 text-right">{money(validReport.income)}</td><td className="px-3 py-3 text-right">{money(validReport.spend)}</td><td className="px-3 py-3 text-right">{validReport.balance==null?"—":money(validReport.balance)}</td></tr></tfoot></table>
   </div>}
   <p className="text-xs leading-5 text-slate-500">Receitas são vendas aprovadas registradas pelo TrackUp, não repasses confirmados na conta bancária. Pagamentos considerados aqui são gastos Meta Ads, não todas as despesas da empresa. Contas 1593509388682189, 2220129438533853 e 1160571526431916 excluídas. Câmbio: R$ 5,50 por dólar, com R$ 5,82 apenas em 27 e 28/10/2026. Sem taxas de checkout, impostos e retiradas. Os lançamentos dependem dos webhooks recebidos.</p>
 </section>
}
