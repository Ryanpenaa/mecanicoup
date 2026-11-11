import {useEffect,useState} from "react";
import {KeyRound,LockKeyhole,ShieldCheck} from "lucide-react";
const ENDPOINT="https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-meta-connect";
export function MetaPixelVaultPanel({dashboardKey,connectionId,pixelId}:{dashboardKey:string;connectionId:string;pixelId:string}){
 const [token,setToken]=useState("");
 const [status,setStatus]=useState<"loading"|"saved"|"missing"|"error">("loading");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
   let live=true;setStatus("loading");setMessage("");
   const params=new URLSearchParams({action:"pixel-token-status",connection_id:connectionId});
   fetch(ENDPOINT+"?"+params,{headers:{"x-dashboard-key":dashboardKey}})
     .then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||"error");return d})
     .then(d=>{if(live)setStatus(d.configured?"saved":"missing")})
     .catch(()=>{if(live)setStatus("error")});
   return()=>{live=false};
 },[dashboardKey,connectionId,pixelId]);
 const save=async()=>{
   if(!token.trim()||busy)return;setBusy(true);setMessage("");
   try{
     const params=new URLSearchParams({action:"save-pixel-token",connection_id:connectionId});
     const res=await fetch(ENDPOINT+"?"+params,{method:"POST",headers:{"x-dashboard-key":dashboardKey,"content-type":"application/json"},body:JSON.stringify({pixel_id:pixelId,access_token:token.trim()})});
     const d=await res.json();if(!res.ok||!d.ok)throw Error(d.detail||d.error||"Não foi possível validar o token");
     setToken("");setStatus("saved");setMessage("Token validado e armazenado no Supabase. O envio CAPI ainda depende da configuração de eventos e deduplicação.");
   }catch(e){setMessage(e instanceof Error?e.message:"Falha na validação");}
   finally{setBusy(false);}
 };
 return <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
  <div className="flex items-center gap-2"><LockKeyhole size={18} className="text-blue-700"/><h3 className="text-sm font-bold text-slate-800">Token da API de Conversões · Pixel {pixelId}</h3></div>
  <p className="mt-2 text-xs text-slate-600">Insira o token de acesso CAPI gerado no Gerenciador de Eventos da Meta. Ele será validado e criptografado no servidor. Nunca aparecerá no script da sua página.</p>
  <p className="mt-2 text-xs font-bold text-slate-700">Situação: {status==="saved"?"Token armazenado":status==="missing"?"Token ainda não configurado":status==="loading"?"Consultando...":"Não foi possível verificar"}</p>
  <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Token CAPI do pixel" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Cole seu token CAPI aqui" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3 text-xs"/><button type="button" disabled={busy||token.trim().length<20} onClick={save} className="trackup-action"><KeyRound size={15}/>{busy?"Validando...":"Validar e salvar"}</button></div>
  {message&&<p className="mt-2 text-xs text-slate-700" role="status">{message}</p>}
  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck size={13}/> A configuração não ativa nenhum envio de Purchase por conta própria.</p>
 </div>;
}
