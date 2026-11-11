import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

const ENDPOINT = "https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-meta-connect";
type Connection={id:string;meta_user_id:string;meta_user_name:string;status:string;token_expires_at:string|null;granted_scopes:string[];selected_ad_accounts:string[];selected_pixel_id:string|null};
type Account={id:string;account_id:string;name:string;currency?:string;business?:{id:string;name:string}};
type Pixel={id:string;name:string};
type Assets={accounts:Account[];businesses:{id:string;name:string}[];pixels:{account:string;pixels:Pixel[]}[]};
async function request(key:string,action:string,init?:RequestInit,params?:Record<string,string>){
 const u=new URL(ENDPOINT);u.searchParams.set("action",action);
 for(const [k,v] of Object.entries(params||{}))u.searchParams.set(k,v);
 const r=await fetch(u,{...init,headers:{"x-dashboard-key":key,...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});
 const data=await r.json();if(!r.ok||!data.ok)throw Error(data.detail||data.error||"Falha na conexão");
 return data;
}
export function MetaConnectionPanel({dashboardKey}:{dashboardKey:string}){
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [configured,setConfigured]=useState(false);
 const [missing,setMissing]=useState<string[]>([]);
 const [connections,setConnections]=useState<Connection[]>([]);
 const [selected,setSelected]=useState("");
 const [assets,setAssets]=useState<Assets|null>(null);
 const [accountIds,setAccountIds]=useState<string[]>([]);
 const [pixel,setPixel]=useState("");
 const [message,setMessage]=useState("");
 const fetchStatus=useCallback(async()=>{
  try{const result=await request(dashboardKey,"status");setConfigured(result.configured);setMissing(result.requires||[]);setConnections(result.connections||[]);setSelected(current=>current||(result.connections?.[0]?.id||""));}
  catch(e){setMessage(e instanceof Error?e.message:"Erro ao verificar conexão");}
  finally{setLoading(false);}
 },[dashboardKey]);
 useEffect(()=>{void fetchStatus();},[fetchStatus]);
 useEffect(()=>{
  const onMessage=(event:MessageEvent)=>{
   if(event.origin!=="https://xahydzcmpikbioeyvwst.supabase.co")return;
   if(event.data?.type==="trackup-meta-oauth"){
    setMessage(event.data.success?"Facebook autorizado. Atualizando conexões...":"A autorização não foi concluída.");
    void fetchStatus();
   }
  };
  window.addEventListener("message",onMessage);
  return()=>window.removeEventListener("message",onMessage);
 },[fetchStatus]);
 useEffect(()=>{const current=connections.find(c=>c.id===selected);if(current){setAccountIds(current.selected_ad_accounts||[]);setPixel(current.selected_pixel_id||"");}setAssets(null);},[selected,connections]);
 const connect=async()=>{
  setBusy(true);setMessage("");
  try{
   const data=await request(dashboardKey,"start",{method:"POST"});
   const popup=window.open(data.authorization_url,"trackup-meta-oauth","width=600,height=780");
   if(!popup)window.location.href=data.authorization_url;
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível iniciar a autorização");}
  finally{setBusy(false);}
 };
 const loadAssets=async()=>{if(!selected)return;setBusy(true);setMessage("");try{const data=await request(dashboardKey,"assets",undefined,{connection_id:selected});setAssets(data);}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível consultar ativos");}finally{setBusy(false);}};
 const save=async()=>{setBusy(true);setMessage("");try{await request(dashboardKey,"select",{method:"POST",body:JSON.stringify({account_ids:accountIds,pixel_id:pixel||null})},{connection_id:selected});setMessage("Contas e pixel selecionados. O vínculo não altera o pixel nas páginas de checkout.");await fetchStatus();}catch(e){setMessage(e instanceof Error?e.message:"Erro ao salvar");}finally{setBusy(false);}};
 const disconnect=async()=>{if(!selected||!window.confirm("Desconectar esta conta Meta do TrackUp?"))return;setBusy(true);try{await request(dashboardKey,"disconnect",{method:"POST"},{connection_id:selected});setSelected("");setAssets(null);await fetchStatus();}catch(e){setMessage(e instanceof Error?e.message:"Erro ao desconectar");}finally{setBusy(false);}};
 const current=connections.find(c=>c.id===selected);
 const possiblePixels=assets?.pixels.flatMap(x=>x.pixels.map(p=>({...p,account:x.account}))).filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i)||[];
 return <div className="space-y-4">
  <div className="trackup-page-heading"><div><p className="trackup-overline">ACESSO COM CONSENTIMENTO</p><h2>Conectar Facebook Ads</h2><p>Entre com o Facebook, autorize os dados e escolha as contas e o pixel que o TrackUp deve usar.</p></div><button className="trackup-action-secondary" type="button" onClick={()=>void fetchStatus()}><RefreshCw size={16}/> Verificar</button></div>
  <section className="trackup-ops-surface">
   <div className="flex items-center gap-3"><ShieldCheck className="text-blue-600"/><div><h3 className="font-bold">Login oficial da Meta</h3><p className="text-xs text-slate-500">A senha é digitada somente no Facebook. O TrackUp guarda o token de acesso criptografado no servidor.</p></div></div>
   {loading?<p className="mt-4 text-sm text-slate-500">Verificando configurações...</p>:!configured?<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Preparação necessária no Meta for Developers.</strong><p className="mt-1 text-xs">O aplicativo Meta precisa de App ID, App Secret e uma configuração de Login for Business com permissões liberadas. O administrador deve cadastrar este callback:</p><code className="mt-2 block break-all rounded-lg bg-white p-2 text-xs">https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-meta-connect?action=callback</code><p className="mt-2 text-xs">Configurações pendentes: {missing.join(", ")||"App Meta"}. Não há autorização ativa até completar esse cadastro.</p></div>:<div className="mt-4"><button type="button" className="trackup-action" disabled={busy} onClick={connect}><Link2 size={16}/>{busy?"Iniciando...":"Entrar com Facebook"}</button></div>}
   {Boolean(connections.length)&&<div className="mt-5 border-t border-slate-100 pt-4">
    <label className="block text-xs font-semibold text-slate-600">Conta autorizada<select className="mt-2 block w-full max-w-lg rounded-lg border border-slate-200 bg-white p-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}>{connections.map(c=><option key={c.id} value={c.id}>{c.meta_user_name||c.meta_user_id} — {c.status}</option>)}</select></label>
    {current&&<><p className="mt-3 text-xs text-slate-600">Permissões concedidas: {current.granted_scopes.join(", ")||"Não informadas"} · Validade: {current.token_expires_at?new Date(current.token_expires_at).toLocaleDateString("pt-BR"):"não informada"}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={loadAssets} className="trackup-action"><RefreshCw size={15}/> Listar BMs, contas e pixels</button><button disabled={busy} type="button" onClick={disconnect} className="trackup-action-secondary"><Unplug size={15}/> Desconectar</button></div></>}
   </div>}
   {assets&&<div className="mt-5 border-t border-slate-100 pt-4"><h3 className="font-bold">Ativos autorizados</h3><p className="mt-1 text-xs text-slate-500">BMs: {assets.businesses.map(b=>b.name).join(", ")||"Nenhuma retornada"}. Selecione as contas que deseja consultar.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{assets.accounts.map(a=><label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={accountIds.includes(a.account_id)} onChange={e=>setAccountIds(old=>e.target.checked?[...old,a.account_id]:old.filter(x=>x!==a.account_id))}/><span>{a.name}<small className="block text-slate-500">{a.account_id} · {a.currency||"—"}</small></span></label>)}</div>
    <label className="mt-4 block text-xs font-semibold text-slate-600">Pixel de destino<select value={pixel} onChange={e=>setPixel(e.target.value)} className="mt-2 block w-full max-w-lg rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="">Selecionar depois</option>{possiblePixels.filter(p=>accountIds.includes(p.account.replace(/^act_/,""))).map(p=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></label>
    <button type="button" disabled={busy} onClick={save} className="trackup-action mt-4"><Check size={16}/> Salvar seleção</button>
   </div>}
   {message&&<p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">{message}</p>}
  </section>
  <section className="trackup-ops-surface"><h3 className="font-bold">Próximo passo: ativar o rastreamento</h3><p className="mt-2 text-xs leading-5 text-slate-600">A autorização da Meta permite descobrir contas e pixels, mas não instala automaticamente o pixel em sites externos. O TrackUp precisa de integração específica com cada checkout e autorização para enviar eventos ao pixel escolhido. O monitoramento atual de Vega/Appmax continua independente dessa nova conexão.</p></section>
 </div>;
}
