import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Columns3, ExternalLink, FileDown, RefreshCw, Search, Square, ToggleLeft } from "lucide-react";

const ENDPOINT="https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-meta-connect";
type Level="campaign"|"adset"|"ad";
type Account={id:string;account_id:string;name:string};
type Connection={id:string;meta_user_name:string;status:string;selected_ad_accounts:string[];granted_scopes:string[]};
type Insights={spend?:string;impressions?:string;clicks?:string;inline_link_clicks?:string;actions?:Array<{action_type:string;value:string}>;action_values?:Array<{action_type:string;value:string}>};
type Row={id:string;name:string;status:string;effective_status:string;account_id:string;campaign_id?:string;adset_id?:string;insights:Insights|null};
const columns=[{id:"status",name:"Status"},{id:"spend",name:"Gasto"},{id:"impressions",name:"Impressões"},{id:"clicks",name:"Cliques"},{id:"cpc",name:"CPC"},{id:"ctr",name:"CTR"},{id:"checkouts",name:"Checkouts"},{id:"purchases",name:"Compras"},{id:"cpa",name:"CPA"},{id:"roas",name:"ROAS"}] as const;
const money=(n:number,c:string)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:c||"BRL"}).format(n);
const number=(n:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(n);
const getAction=(a:Insights["actions"],names:string[])=>names.reduce((v,k)=>v+(Number(a?.find(x=>x.action_type===k)?.value)||0),0);
const readColumns=()=>{try{const saved=JSON.parse(localStorage.getItem("trackup_manage_columns_v1")||"null");if(Array.isArray(saved))return saved.filter((x:unknown):x is string=>typeof x==="string"&&columns.some(c=>c.id===x));}catch{}return ["status","spend","impressions","clicks","cpc","ctr","checkouts","purchases","roas"]};
const request=async(key:string,action:string,query:Record<string,string>={},options?:RequestInit)=>{
 const params=new URLSearchParams({...query,action});const response=await fetch(ENDPOINT+"?"+params,{...options,headers:{"x-dashboard-key":key,...(options?.body?{"content-type":"application/json"}:{}),...options?.headers}});
 const data=await response.json();if(!response.ok||data.ok!==true)throw new Error(data.detail||data.error||"Falha ao consultar a Meta");return data;
};
export function CampaignControlPanel({dashboardKey,start,end,onConnect}:{dashboardKey:string;start:string;end:string;onConnect:()=>void}){
 const [connections,setConnections]=useState<Connection[]>([]);
 const [connection,setConnection]=useState("");
 const [account,setAccount]=useState("");
 const [level,setLevel]=useState<Level>("campaign");
 const [rows,setRows]=useState<Row[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [onlyStatus,setOnlyStatus]=useState("all");
 const [selected,setSelected]=useState<string[]>([]);
 const [showColumns,setShowColumns]=useState(false);
 const [visible,setVisible]=useState<string[]>(readColumns);
 const [currency,setCurrency]=useState("BRL");
 const selectedConnection=connections.find(c=>c.id===connection);
 const allowed=selectedConnection?.selected_ad_accounts||[];
 const canEdit=selectedConnection?.granted_scopes.includes("ads_management")===true;
 const refreshConnections=useCallback(async()=>{
  try{const d=await request(dashboardKey,"status");setConnections(d.connections||[]);setConnection(old=>old||(d.connections?.[0]?.id||""));}
  catch(e){setError(e instanceof Error?e.message:"Falha nas conexões");}
 },[dashboardKey]);
 useEffect(()=>{void refreshConnections()},[refreshConnections]);
 useEffect(()=>{setAccount(old=>allowed.includes(old)?old:allowed[0]||"");},[connection,connections]);
 const load=useCallback(async()=>{
  if(!connection||!account)return;setBusy(true);setError("");setNotice("");
  try{
   const d=await request(dashboardKey,"campaigns",{connection_id:connection,account_id:account,level,start,end});
   setRows(d.items||[]);setSelected([]);
   setNotice((d.items||[]).length+" itens encontrados. Status atualizado diretamente pela Meta.");
  }catch(e){setRows([]);setError(e instanceof Error?e.message:"Falha na consulta");}
  finally{setBusy(false);}
 },[dashboardKey,connection,account,level,start,end]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>rows.filter(r=>(onlyStatus==="all"||r.effective_status===onlyStatus||r.status===onlyStatus)&&(!search||r.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))),[rows,onlyStatus,search]);
 const toggleColumn=(column:string)=>setVisible(old=>{const next=old.includes(column)?old.filter(x=>x!==column):[...old,column];localStorage.setItem("trackup_manage_columns_v1",JSON.stringify(next));return next;});
 const changeStatus=async(ids:string[],status:"ACTIVE"|"PAUSED")=>{
  if(!canEdit||!ids.length||busy)return;
  const verb=status==="ACTIVE"?"ATIVAR":"PAUSAR";
  if(!window.confirm(`Deseja ${verb} ${ids.length} ${level==="campaign"?"campanha(s)":level==="adset"?"conjunto(s)":"anúncio(s)"} no Facebook? Esta ação altera campanhas reais.`))return;
  setBusy(true);setError("");setNotice("");
  try{
   const d=await request(dashboardKey,"status-change",{connection_id:connection},{method:"POST",body:JSON.stringify({account_id:account,level,ids,status})});
   setNotice(d.updated+" de "+ids.length+" alterações confirmadas pela API da Meta.");
   if(d.results.some((r:{success:boolean})=>!r.success))setError("Uma ou mais alterações falharam: "+d.results.filter((r:{success:boolean})=>!r.success).map((r:{error:string})=>r.error).join(" · "));
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar status");}
  finally{setBusy(false);}
 };
 const metric=(r:Row,key:string)=>{
   const data=r.insights||{},spend=Number(data.spend)||0,clicks=Number(data.clicks)||0,impressions=Number(data.impressions)||0;
   const checkout=getAction(data.actions,["omni_initiated_checkout","initiate_checkout"]);
   const purchases=getAction(data.actions,["omni_purchase","purchase"]);
   const value=(data.action_values||[]).filter(a=>["omni_purchase","purchase"].includes(a.action_type)).reduce((max,a)=>Math.max(max,Number(a.value)||0),0);
   switch(key){
     case "status":return r.effective_status||r.status||"—";
     case "spend":return money(spend,currency);
     case "impressions":return number(impressions);
     case "clicks":return number(clicks);
     case "cpc":return clicks?money(spend/clicks,currency):"—";
     case "ctr":return impressions?number(clicks/impressions*100)+"%":"—";
     case "checkouts":return number(checkout);
     case "purchases":return number(purchases);
     case "cpa":return purchases?money(spend/purchases,currency):"—";
     case "roas":return spend?number(value/spend)+"x":"—";
     default:return "—";
   }
 };
 const exportCsv=()=>{
  const head=["Nome","ID",...columns.filter(c=>visible.includes(c.id)).map(c=>c.name)];
  const q=(x:unknown)=>'"'+String(x??"").replace(/"/g,'""')+'"';
  const csv="\uFEFF"+[head.map(q).join(";"),...filtered.map(r=>[r.name,r.id,...columns.filter(c=>visible.includes(c.id)).map(c=>metric(r,c.id))].map(q).join(";"))].join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="trackup-"+level+"-"+end+".csv";a.click();URL.revokeObjectURL(url);
 };
 return <section className="trackup-ops-surface space-y-4">
  <div className="trackup-page-heading"><div><p className="trackup-overline">CONTROLE DE ANÚNCIOS</p><h2>Gerenciador de campanhas</h2><p>Contas, campanhas, conjuntos e anúncios autorizados pelo Facebook.</p></div>
   <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} disabled={busy||!account} className="trackup-action-secondary"><RefreshCw size={15}/> Atualizar</button><button type="button" onClick={exportCsv} className="trackup-action-secondary" disabled={!rows.length}><FileDown size={15}/> CSV</button><button type="button" onClick={()=>window.print()} className="trackup-action-secondary"><FileDown size={15}/> PDF</button><button type="button" onClick={()=>setShowColumns(x=>!x)} className="trackup-action-secondary"><Columns3 size={15}/> Colunas</button></div>
  </div>
  {!connections.length?<div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p>Para listar e controlar campanhas diretamente, conecte sua conta pelo login oficial do Facebook.</p><button type="button" onClick={onConnect} className="trackup-action mt-3">Configurar login Meta <ExternalLink size={15}/></button></div>:<>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Conexão Facebook<select className="trackup-management-select" value={connection} onChange={e=>setConnection(e.target.value)}>{connections.map(c=><option key={c.id} value={c.id}>{c.meta_user_name} ({c.status})</option>)}</select></label>
    <label className="text-xs font-bold text-slate-600">Conta de anúncios<select className="trackup-management-select" value={account} onChange={e=>setAccount(e.target.value)}><option value="">Selecione uma conta</option>{allowed.map(id=><option key={id} value={id}>{id}</option>)}</select></label></div>
    {!allowed.length&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Nenhuma conta selecionada. Abra Integrações, consulte os ativos e selecione a conta que deseja gerenciar.</p>}
    <div className="trackup-management-levels" role="group" aria-label="Nível do gerenciador">{([{id:"campaign",title:"Campanhas"},{id:"adset",title:"Conjuntos"},{id:"ad",title:"Anúncios"}] as const).map(item=><button key={item.id} type="button" aria-pressed={level===item.id} onClick={()=>setLevel(item.id)}>{item.title}</button>)}</div>
    <div className="trackup-management-filters"><label className="trackup-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome" /></label><label className="trackup-ops-filter"><select value={onlyStatus} onChange={e=>setOnlyStatus(e.target.value)} aria-label="Filtrar status"><option value="all">Todos os status</option><option value="ACTIVE">Ativos</option><option value="PAUSED">Pausados</option><option value="CAMPAIGN_PAUSED">Campanha pausada</option><option value="ADSET_PAUSED">Conjunto pausado</option></select></label><span className="text-xs text-slate-500">{start.split("-").reverse().join("/")} a {end.split("-").reverse().join("/")}</span></div>
    {showColumns&&<div className="trackup-layout-picker"><strong>Selecionar colunas</strong>{columns.map(c=><label key={c.id}><input type="checkbox" checked={visible.includes(c.id)} onChange={()=>toggleColumn(c.id)}/>{c.name}</label>)}</div>}
    {selected.length>0&&<div className="trackup-batch-toolbar"><span>{selected.length} selecionado(s)</span><button disabled={!canEdit||busy} type="button" onClick={()=>void changeStatus(selected,"ACTIVE")}>Ativar selecionados</button><button disabled={!canEdit||busy} type="button" onClick={()=>void changeStatus(selected,"PAUSED")}>Pausar selecionados</button><button type="button" onClick={()=>setSelected([])}>Limpar seleção</button></div>}
    {!canEdit&&<p className="text-xs text-amber-700">Controle de status somente leitura: o Facebook precisa autorizar a permissão ads_management para ativar ou pausar campanhas.</p>}
    {notice&&<p role="status" className="text-xs text-emerald-700">{notice}</p>}
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="trackup-ops-table min-w-max w-full text-left"><thead><tr><th><input type="checkbox" aria-label="Selecionar todos visíveis" checked={filtered.length>0&&filtered.every(r=>selected.includes(r.id))} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...filtered.map(r=>r.id)])]:current.filter(id=>!filtered.some(r=>r.id===id)))}/></th><th>{level==="campaign"?"Campanha":level==="adset"?"Conjunto":"Anúncio"}</th>{columns.filter(c=>visible.includes(c.id)).map(c=><th key={c.id}>{c.name}</th>)}<th>Gerenciador</th><th>Controle</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,row.id]:old.filter(id=>id!==row.id))} aria-label={"Selecionar "+row.name}/></td><td><strong>{row.name}</strong><small className="block text-slate-400">{row.id}</small></td>{columns.filter(c=>visible.includes(c.id)).map(c=><td key={c.id}>{metric(row,c.id)}</td>)}<td><a title="Abrir no Gerenciador da Meta" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline" href={`https://adsmanager.facebook.com/adsmanager/manage/${level==="campaign"?"campaigns":level==="adset"?"adsets":"ads"}?act=${account}&selected_${level}_ids=${row.id}`}>Abrir <ExternalLink className="inline h-3 w-3"/></a></td><td><button title={canEdit?"Clique para alterar com confirmação":"Sem permissão de edição"} disabled={!canEdit||busy} onClick={()=>void changeStatus([row.id],row.status==="ACTIVE"?"PAUSED":"ACTIVE")} className="trackup-status-action"><ToggleLeft size={18}/>{row.status==="ACTIVE"?"Pausar":"Ativar"}</button></td></tr>)}{!filtered.length&&<tr><td colSpan={columns.length+4} className="text-center py-10 text-slate-500">{busy?"Consultando Facebook...":"Nenhuma campanha encontrada nesse período ou filtro."}</td></tr>}</tbody></table></div>
    <p className="text-xs text-slate-500">Gastos e indicadores são os valores retornados pela Meta na moeda da conta. Status efetivo pode ser diferente do status configurado quando campanha ou conjunto pai está pausado. Alterações exigem confirmação e ficam registradas para auditoria.</p>
  </>}
 </section>;
}
