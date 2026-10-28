import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, Clock3, Loader2, RefreshCw, Search, ShieldCheck, TrendingUp } from "lucide-react";

const ENDPOINT = "https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-ad-review";
type Day = {date:string;spend:number;clicks:number;link_clicks:number;impressions:number;checkouts:number;meta_purchases:number;trackup_purchases:number;trackup_revenue_brl:number};
type Account = {account_id:string;name:string;business?:{id:string;name:string}|null;currency:string};
type Ad = {account_id:string;ad_id:string;ad_name:string;campaign_name:string;adset_name:string;effective_status:string;days:Day[]};
type Report = {ok:boolean;date:string;generated_at:string;accounts:Account[];ads:Ad[];attribution:{approved:number;matched:number;unmatched:number;limited:boolean};warnings:string[];recorded?:boolean;slot?:string;attribution_failed?:boolean};
type Snapshot = {review_date:string;slot:string;captured_at:string;payload:Report};
type Metrics = {spend:number;clicks:number;linkClicks:number;impressions:number;checkouts:number;metaSales:number;trackupSales:number;revenue:number;cpc:number;ctr:number;roas:number|null};
const WINDOWS=[{id:"manha",name:"Manhã",range:"06h–07h",start:6,end:7},{id:"tarde",name:"Tarde",range:"12h–13h",start:12,end:13},{id:"noite",name:"Noite",range:"18h–20h",start:18,end:20}];
const PERIODS=[1,3,7,15,30];
function localParts(){const v=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Porto_Velho",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(new Date());const part=(key:string)=>v.find(x=>x.type===key)?.value||"";return {date:part("year")+"-"+part("month")+"-"+part("day"),hour:Number(part("hour"))};}
function shift(date:string,n:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function fx(date:string,currency:string){if(currency==="BRL")return 1;if(currency==="USD")return date==="2026-10-27"||date==="2026-10-28"?5.82:5.5;return NaN;}
const money=(n:number)=>Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n):"—";
const number=(n:number,d=0)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
function totals(ad:Ad,account:Account|undefined,period:number,day:string):Metrics{
 const from=shift(day,1-period);const m={spend:0,clicks:0,linkClicks:0,impressions:0,checkouts:0,metaSales:0,trackupSales:0,revenue:0,cpc:0,ctr:0,roas:null as number|null};
 for(const item of ad.days||[]){
   if(item.date<from||item.date>day)continue;
   const rate=fx(item.date,account?.currency||"UNKNOWN");
   if(!Number.isFinite(rate))m.spend=NaN;
   else if(Number.isFinite(m.spend))m.spend+=Number(item.spend||0)*rate;
   m.clicks+=Number(item.clicks||0);m.linkClicks+=Number(item.link_clicks||0);m.impressions+=Number(item.impressions||0);
   m.checkouts+=Number(item.checkouts||0);m.metaSales+=Number(item.meta_purchases||0);
   m.trackupSales+=Number(item.trackup_purchases||0);m.revenue+=Number(item.trackup_revenue_brl||0);
 }
 m.cpc=m.linkClicks>0?m.spend/m.linkClicks:0;
 m.ctr=m.impressions>0?100*m.linkClicks/m.impressions:0;
 m.roas=m.spend>0&&Number.isFinite(m.spend)?m.revenue/m.spend:null;
 return m;
}
function evaluation(m:Metrics,period:number,unreliable:boolean){
 if(unreliable||!Number.isFinite(m.spend))return {label:"Dados parciais",tone:"slate",detail:"Não tomar decisões: consulta ou atribuição incompleta."};
 if(m.spend===0&&m.metaSales===0&&m.trackupSales===0)return {label:"Sem entrega",tone:"slate",detail:"Sem investimento registrado neste período. Conferir status e veiculação."};
 if(m.trackupSales>0){
   if(m.roas!==null&&m.roas>=1.7&&period>=3&&m.trackupSales>=2)return {label:"Bom desempenho",tone:"green",detail:"Anúncio com vendas confirmadas e retorno consistente no período. Manter e comparar os próximos dias."};
   if(m.roas!==null&&m.roas<1)return {label:"Retorno abaixo do gasto",tone:"red",detail:"As vendas identificadas não cobriram o investimento em mídia. Revisar criativo e custo de aquisição."};
   return {label:"Gerando vendas",tone:"green",detail:"Há venda confirmada pelo TrackUp. Comparar a consistência em 3 e 7 dias antes de escalar."};
 }
 if(m.metaSales>0)return {label:"Venda somente na Meta",tone:"amber",detail:"A Meta atribuiu compra, mas o TrackUp não vinculou venda a este anúncio. Conciliar antes de desligar."};
 if(m.checkouts>=4)return {label:"Checkout sem venda rastreada",tone:"amber",detail:"Existem checkouts iniciados, mas nenhuma venda vinculada. Conferir aprovação e atraso de webhook."};
 if(m.spend>=40&&period>=3)return {label:"Revisar gasto sem venda",tone:"red",detail:"Investiu pelo menos R$ 40 sem vendas identificadas. Rever CPC, criativo e rastreamento antes de cortar."};
 if(m.linkClicks>=10&&m.cpc>2.5)return {label:"CPC elevado",tone:"amber",detail:"Custo por clique no link acima de R$ 2,50; acompanhar CTR e desempenho do criativo."};
 return {label:"Em observação",tone:"blue",detail:"Volume ainda insuficiente para concluir. Acompanhar as próximas leituras."};
}
const toneClass:Record<string,string>={green:"bg-emerald-50 text-emerald-800 border-emerald-200",red:"bg-rose-50 text-rose-800 border-rose-200",amber:"bg-amber-50 text-amber-800 border-amber-200",blue:"bg-blue-50 text-blue-800 border-blue-200",slate:"bg-slate-100 text-slate-600 border-slate-200"};
const dateLabel=(date:string)=>date.split("-").reverse().join("/");
export function AdAnalysisPanel({dashboardKey}:{dashboardKey:string}){
 const [data,setData]=useState<Report|null>(null),[history,setHistory]=useState<Snapshot[]>([]);
 const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[period,setPeriod]=useState(3),[detail,setDetail]=useState<string|null>(null),[tick,setTick]=useState(0);
 const [clock,setClock]=useState(localParts());
 useEffect(()=>{
   let mounted=true,lastCapture="";
   const headers={"x-dashboard-key":dashboardKey};
   const query=async(action:string,slot?:string):Promise<Report>=>{
     const q=new URLSearchParams({action,date:localParts().date});
     if(slot)q.set("slot",slot);
     const r=await fetch(ENDPOINT+"?"+q,{headers});
     const body=await r.json();
     if(!r.ok)throw Error(body.detail||body.capture_error||body.error||"Consulta indisponível");
     return body;
   };
   const loadHistory=async()=>{try{const r=await fetch(ENDPOINT+"?action=history",{headers});const v=await r.json();if(r.ok&&mounted)setHistory(v.snapshots||[])}catch{}};
   const load=async(force:boolean)=>{
     const p=localParts();setClock(p);
     const windowId=WINDOWS.find(w=>p.hour>=w.start&&p.hour<w.end)?.id;
     const slot=force?(windowId||"extra"):(windowId&&lastCapture!==p.date+":"+windowId?windowId:null);
     if(slot)lastCapture=p.date+":"+slot;
     if(force)setRefreshing(true);else if(!data)setLoading(true);
     try {
       const result=await query(slot?"capture":"overview",slot||undefined);
       if(mounted){setData(result);setError("");if(slot)void loadHistory();}
     }catch(e){if(mounted)setError(e instanceof Error?e.message:"Falha na análise");}
     finally{if(mounted){setLoading(false);setRefreshing(false)}}
   };
   void Promise.all([load(tick>0),loadHistory()]);
   const timer=window.setInterval(()=>{const p=localParts(),slot=WINDOWS.find(w=>p.hour>=w.start&&p.hour<w.end)?.id;setClock(p);if(slot&&lastCapture!==p.date+":"+slot)void load(false);},60000);
   return()=>{mounted=false;window.clearInterval(timer);};
 },[dashboardKey,tick]);
 const currentDate=data?.date||clock.date;
 const unreliable=Boolean(data?.attribution.limited||data?.attribution_failed||data?.warnings.some(w=>w.startsWith("Falha na conta")));
 const accountsById=new Map((data?.accounts||[]).map(a=>[a.account_id,a]));
 const list=useMemo(()=>((data?.ads||[]).filter(ad=>(ad.ad_name+" "+ad.campaign_name+" "+ad.adset_name).toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>{
    const am=totals(a,(data?.accounts||[]).find(x=>x.account_id===a.account_id),period,currentDate);
    const bm=totals(b,(data?.accounts||[]).find(x=>x.account_id===b.account_id),period,currentDate);
    return (Number.isFinite(bm.spend)?bm.spend:0)-(Number.isFinite(am.spend)?am.spend:0);
 }),[data,search,period,currentDate]);
 const bmGroups=useMemo(()=>{
   const groups=new Map<string,{bm:string;accounts:Account[]}>();
   for(const account of data?.accounts||[]){const id=account.business?.id||"unassigned",name=account.business?.name||"BM não identificada";const g=groups.get(id)||{bm:name,accounts:[]};g.accounts.push(account);groups.set(id,g);}
   return [...groups.values()];
 },[data]);
 const totalAds=(data?.ads||[]).length;
 const summaries=(data?.ads||[]).map(a=>totals(a,accountsById.get(a.account_id),period,currentDate));
 const sumSpend=summaries.reduce((n,m)=>n+(Number.isFinite(m.spend)?m.spend:0),0);
 const sumSales=summaries.reduce((n,m)=>n+m.trackupSales,0);
 const sumMeta=summaries.reduce((n,m)=>n+m.metaSales,0);
 const sumRevenue=summaries.reduce((n,m)=>n+m.revenue,0);
 const currentWindow=WINDOWS.find(w=>clock.hour>=w.start&&clock.hour<w.end);
 return <section className="min-w-0 space-y-5" aria-label="Análise diária de anúncios por BM e conta">
   <div className="flex flex-wrap items-start justify-between gap-3">
     <div><div className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-600"/><h2 className="text-xl font-extrabold text-slate-950">Análise de Anúncios</h2></div>
       <p className="mt-1 text-sm text-slate-500">Leitura por anúncio, separada automaticamente por BM e conta ativa. Sem selecionar contas.</p></div>
     <button type="button" disabled={loading||refreshing} onClick={()=>setTick(n=>n+1)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
       <RefreshCw className={"h-4 w-4 "+(refreshing?"animate-spin":"")}/>Registrar leitura agora
     </button>
   </div>
   <div className="grid gap-3 md:grid-cols-3">
     {WINDOWS.map(w=>{
       const snapshot=history.find(x=>x.review_date===clock.date&&x.slot===w.id);
       const active=currentWindow?.id===w.id;
       return <div key={w.id} className={"rounded-2xl border bg-white p-4 "+(active?"border-blue-400 ring-1 ring-blue-200":"border-slate-200")}>
         <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-extrabold"><Clock3 className="h-4 w-4 text-blue-600"/>{w.name}</p><span className="text-xs font-bold text-slate-500">{w.range}</span></div>
         <p className="mt-2 text-sm font-bold text-slate-700">{snapshot?"Leitura registrada":active?"Janela de análise aberta":"Aguardando leitura"}</p>
         <p className="mt-1 text-xs text-slate-500">{snapshot?"Capturada às "+new Date(snapshot.captured_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Porto_Velho"}):"Registro automático ao abrir a aba nesta faixa de horário"}</p>
       </div>;
     })}
   </div>
   {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mr-1 inline h-4 w-4"/>{error}. {data?"Exibindo a última leitura disponível.":""}</div>}
   {loading&&!data&&<div className="flex items-center gap-3 rounded-xl bg-white p-6 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin"/>Consultando anúncios e vendas dos últimos 30 dias…</div>}
   {data&&<>
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
       <div><p className="text-sm font-extrabold text-slate-900">Comparação por período</p><p className="mt-1 text-xs text-slate-500">Os 5 períodos aparecem em cada anúncio. Clique para detalhar.</p></div>
       <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{PERIODS.map(n=><button key={n} type="button" aria-pressed={period===n} onClick={()=>setPeriod(n)} className={"rounded-lg px-3 py-2 text-xs font-bold "+(period===n?"bg-blue-600 text-white":"text-slate-600 hover:bg-white")}>{n} {n===1?"dia":"dias"}</button>)}</div>
     </div>
     <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">Gasto · {period}d</p><p className="mt-2 text-xl font-black tabular-nums">{money(sumSpend)}</p><p className="mt-1 text-xs text-slate-500">Contas autorizadas</p></div>
       <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">Vendas TrackUp identificadas</p><p className="mt-2 text-xl font-black tabular-nums">{unreliable?"—":number(sumSales)}</p><p className="mt-1 text-xs text-slate-500">Sem somar compras Meta</p></div>
       <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">Compras atribuídas pela Meta</p><p className="mt-2 text-xl font-black tabular-nums">{number(sumMeta)}</p><p className="mt-1 text-xs text-slate-500">Informação independente</p></div>
       <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">ROAS das vendas identificadas</p><p className="mt-2 text-xl font-black tabular-nums">{unreliable||sumSpend===0?"—":number(sumRevenue/sumSpend,2)+"x"}</p><p className="mt-1 text-xs text-slate-500">{totalAds} anúncios encontrados</p></div>
     </div>
     <p className="text-xs leading-relaxed text-slate-500">Última consulta: {new Date(data.generated_at).toLocaleString("pt-BR",{timeZone:"America/Porto_Velho"})} · {data.attribution.matched} de {data.attribution.approved} vendas aprovadas com atribuição por criativo nos últimos 30 dias. Gastos convertidos para BRL; USD = R$ 5,50, exceto 27–28/10/2026 (R$ 5,82). Janelas são registradas quando a aba está aberta; fora delas o botão salva uma leitura extra.</p>
     {data.warnings?.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mr-1 inline h-4 w-4"/>Dados com ressalvas: {data.warnings.join(" · ")}</div>}
     <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar anúncio, conjunto ou campanha" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"/></label>
     {!data.accounts.length&&<p className="rounded-xl bg-white p-5 text-sm text-slate-600">Nenhuma conta ativa autorizada foi retornada pela Meta. As duas contas permitidas permanecem configuradas na integração.</p>}
     {bmGroups.map(group=><div key={group.bm} className="min-w-0 space-y-3">
       <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><ShieldCheck className="h-5 w-5 text-blue-600"/><h3 className="font-extrabold text-slate-950">BM: {group.bm}</h3><span className="text-xs text-slate-500">{group.accounts.length} conta(s)</span></div>
       {group.accounts.map(a=>{
         const accountAds=list.filter(ad=>ad.account_id===a.account_id);
         const allAccountAds=(data.ads||[]).filter(ad=>ad.account_id===a.account_id);
         const spend=allAccountAds.reduce((n,ad)=>{const x=totals(ad,a,period,currentDate).spend;return n+(Number.isFinite(x)?x:0)},0);
         return <div key={a.account_id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
           <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 p-4">
             <div><h4 className="text-sm font-extrabold text-slate-900">{a.name}</h4><p className="text-xs text-slate-500">Conta {a.account_id} · {a.currency} · {accountAds.length} anúncio(s) exibido(s)</p></div>
             <p className="text-sm font-bold">{money(spend)} <span className="text-xs font-normal text-slate-500">em {period}d</span></p>
           </div>
           <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
             <table className="min-w-[1040px] w-full text-left text-xs"><thead className="bg-white text-slate-500"><tr>
               <th className="sticky left-0 z-10 min-w-[220px] border-b bg-white px-3 py-3">Anúncio / campanha</th>
               {PERIODS.map(n=><th key={n} className={"min-w-[116px] border-b px-3 py-3 text-right "+(period===n?"bg-blue-50 text-blue-700":"")}>{n} {n===1?"dia":"dias"}<span className="block text-[10px] font-normal">Gasto / vendas</span></th>)}
               <th className="min-w-[160px] border-b px-3 py-3">Diagnóstico ({period}d)</th>
             </tr></thead><tbody className="divide-y divide-slate-100">{accountAds.map(ad=>{
               const current=totals(ad,a,period,currentDate),decision=evaluation(current,period,unreliable);
               const key=a.account_id+"|"+ad.ad_id;
               return <tr key={key} className="hover:bg-slate-50">
                 <td className="sticky left-0 z-10 max-w-[245px] bg-white px-3 py-3 align-top"><button className="block text-left font-bold text-blue-700 hover:underline" type="button" onClick={()=>setDetail(detail===key?null:key)}>{ad.ad_name}</button><span className="mt-1 block truncate text-[11px] text-slate-500" title={ad.campaign_name}>{ad.campaign_name}</span><span className="block text-[10px] text-slate-400">{ad.effective_status==="ACTIVE"?"Ativo":"Veiculou no período"} · {ad.ad_id}</span></td>
                 {PERIODS.map(n=>{const m=totals(ad,a,n,currentDate);return <td key={n} className={"px-3 py-3 text-right align-top tabular-nums "+(period===n?"bg-blue-50/60":"")}>
                   <span className="block font-extrabold">{money(m.spend)}</span><span className="mt-1 block text-[11px] text-slate-500">{unreliable?"—":m.trackupSales} TrackUp · {m.metaSales} Meta</span>
                 </td>})}
                 <td className="px-3 py-3 align-top"><span className={"inline-flex rounded-md border px-2 py-1 text-[10px] font-bold "+toneClass[decision.tone]}>{decision.label}</span>
                   <button type="button" onClick={()=>setDetail(detail===key?null:key)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-700">Ver feedback <ArrowUpRight className="h-3 w-3"/></button></td>
               </tr>;
             })}</tbody></table>
             {!accountAds.length&&<p className="p-5 text-sm text-slate-500">Nenhum anúncio corresponde à busca nesta conta.</p>}
           </div>
           {accountAds.filter(ad=>detail===a.account_id+"|"+ad.ad_id).map(ad=>{
             const all=PERIODS.map(n=>({days:n,metrics:totals(ad,a,n,currentDate)}));
             return <div key={ad.ad_id} className="space-y-3 border-t border-blue-200 bg-blue-50/50 p-4">
               <div><h5 className="text-base font-extrabold">{ad.ad_name}</h5><p className="text-xs text-slate-500">Campanha: {ad.campaign_name} · Conjunto: {ad.adset_name}</p></div>
               <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{all.map(x=>{
                 const d=evaluation(x.metrics,x.days,unreliable);
                 return <div key={x.days} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-600">{x.days} {x.days===1?"dia":"dias"}</p><span className={"mt-2 inline-block rounded-md border px-2 py-1 text-[10px] font-bold "+toneClass[d.tone]}>{d.label}</span><p className="mt-2 text-xs leading-5 text-slate-600">{d.detail}</p></div>;
               })}</div>
               {(()=>{const m=totals(ad,a,period,currentDate);return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                 {[["Gasto",money(m.spend)],["Cliques no link",number(m.linkClicks)],["CPC link",m.linkClicks?money(m.cpc):"—"],["CTR link",number(m.ctr,2)+"%"],["Checkouts Meta",number(m.checkouts)],["Compras Meta",number(m.metaSales)],["Vendas TrackUp",unreliable?"—":number(m.trackupSales)]].map(x=><div key={x[0]} className="rounded-lg bg-white p-3"><p className="text-[11px] text-slate-500">{x[0]}</p><p className="mt-1 text-sm font-black">{x[1]}</p></div>)}
               </div>})()}
               <p className="text-xs text-slate-500">Compras da Meta podem incluir atribuição com janela diferente das vendas aprovadas pelo TrackUp. Os totais não são somados nem usados para inventar vendas.</p>
             </div>;
           })}
         </div>;
       })}
     </div>)}
     <div className="rounded-2xl border bg-white p-4">
       <h3 className="flex items-center gap-2 text-sm font-extrabold"><TrendingUp className="h-4 w-4 text-blue-600"/>Histórico de leituras</h3>
       <p className="mt-1 text-xs text-slate-500">Últimas leituras registradas. A análise dos anúncios é recalculada a cada consulta; os registros abaixo preservam a leitura feita naquele horário.</p>
       <div className="mt-3 flex flex-wrap gap-2">{history.slice(0,12).map(s=><div key={s.review_date+"-"+s.slot} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600"/><strong>{dateLabel(s.review_date)}</strong> · {WINDOWS.find(w=>w.id===s.slot)?.name||"Extra"} · {new Date(s.captured_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Porto_Velho"})}</div>)}</div>
       {history.length===0&&<p className="mt-3 text-xs text-slate-500">A primeira leitura ainda não foi salva.</p>}
     </div>
   </>}
 </section>;
}