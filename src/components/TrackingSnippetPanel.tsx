import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Code2, Eye, EyeOff, ExternalLink } from "lucide-react";
const ROOT="https://xahydzcmpikbioeyvwst.supabase.co/functions/v1";
export function TrackingSnippetPanel({selectedPixelId}:{selectedPixelId?:string}){
 const [pixelId,setPixelId]=useState("");
 useEffect(()=>{if(selectedPixelId&&/^\d{10,25}$/.test(selectedPixelId))setPixelId(selectedPixelId)},[selectedPixelId]);
 const [preview,setPreview]=useState(false);
 const [copied,setCopied]=useState(false);
 const [trackCheckout,setTrackCheckout]=useState(true);
 const [trackPixel,setTrackPixel]=useState(true);
 const validPixel=!pixelId||/^\d{10,25}$/.test(pixelId);
 const snippet=useMemo(()=>`<script>
(function(){
 if(window.__trackupInstalled)return;window.__trackupInstalled=true;
 var endpoint=${JSON.stringify(ROOT)},pixel=${JSON.stringify(pixelId.trim())};
 var links=${trackCheckout?"true":"false"};
 var pixelEnabled=${trackPixel?"true":"false"};
 var qs=new URLSearchParams(location.search);
 function cookie(name){var parts=document.cookie.split(";");for(var i=0;i<parts.length;i++){var p=parts[i].trim();if(p.indexOf(name+"=")===0)return decodeURIComponent(p.slice(name.length+1));}return "";}
 function id(prefix){return prefix+"_"+Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,"0")}).join("");}
 var tid;try{tid=sessionStorage.getItem("trackup_id");if(!tid||!/^trk_[a-z0-9_]+$/i.test(tid)){tid=id("trk");sessionStorage.setItem("trackup_id",tid);}}catch(e){tid=id("trk");}
 var vid;try{vid=localStorage.getItem("trackup_visitor");if(!vid||!/^vis_[a-z0-9_]+$/i.test(vid)){vid=id("vis");localStorage.setItem("trackup_visitor",vid);}}catch(e){vid=id("vis");}
 var savedCampaign={};try{savedCampaign=JSON.parse(sessionStorage.getItem("trackup_utms")||"{}")}catch(e){}
 var campaign={};["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid"].forEach(function(k){campaign[k]=qs.get(k)||savedCampaign[k]||"";});
 try{sessionStorage.setItem("trackup_utms",JSON.stringify(campaign))}catch(e){}
 var fbclid=campaign.fbclid||"";
 var fbc=cookie("_fbc")||(fbclid?"fb.1."+Date.now()+"."+fbclid:"");
 var data={tracking_id:tid,visitor_id:vid,landing_ts:Date.now(),fbclid:fbclid,fbp:cookie("_fbp"),fbc:fbc,utm_source:campaign.utm_source||"",utm_medium:campaign.utm_medium||"",utm_campaign:campaign.utm_campaign||"",utm_content:campaign.utm_content||"",utm_term:campaign.utm_term||"",landing_url:location.href,referrer:document.referrer,user_agent:navigator.userAgent};
 function post(route,body){try{fetch(endpoint+"/"+route,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true}).catch(function(){});}catch(e){}}
 post("tracking-start",data);
 function event(name,key){post("tracking-event",{tracking_id:tid,event_name:name,event_key:key||"once",metadata:{url:location.href}});}
 var started=Date.now();setTimeout(function(){if(document.visibilityState!=="hidden")event("engaged_15s");},15000);
 var scrolled={};addEventListener("scroll",function(){var max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;var rate=scrollY/max;if(rate>=.5&&!scrolled.fifty){scrolled.fifty=true;event("scroll_50");}if(rate>=.75&&!scrolled.seventy){scrolled.seventy=true;event("scroll_75");}},{passive:true});
 if(links)document.addEventListener("click",function(e){var anchor=e.target.closest&&e.target.closest("a[href]");if(!anchor)return;var u;try{u=new URL(anchor.href);}catch(x){return;}
 var isCheckout=/(^|\\.)((pay\\.)?cakto\\.com\\.br|vega(checkout)?\\.[a-z.]+|pay\\.appmax\\.com\\.br)$/.test(u.hostname)||/(checkout|comprar|finalizar|pagamento)/i.test(anchor.getAttribute("data-trackup")||"");
 if(!isCheckout)return;event("checkout_click",u.hostname);
 u.searchParams.set("tracking_id",tid);
 ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){if(data[k]&&!u.searchParams.has(k))u.searchParams.set(k,data[k]);});
 anchor.href=u.toString();
 },true);
 if(pixel&&pixelEnabled){
   if(!window.fbq){var fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments)};window.fbq=fbq;fbq.push=fbq;fbq.loaded=true;fbq.version="2.0";fbq.queue=[];var script=document.createElement("script");script.async=true;script.src="https://connect.facebook.net/en_US/fbevents.js";document.head.appendChild(script);}
   window.__trackupPixels=window.__trackupPixels||{};
   if(!window.__trackupPixels[pixel]){window.__trackupPixels[pixel]=true;window.fbq("init",pixel);window.fbq("track","PageView");}
 }
 window.TrackUp={trackingId:tid,track:function(name,key){if(["view_plans","select_plan","checkout_click","video_start","video_25","video_50","video_75","video_complete"].indexOf(name)>=0)event(name,key);}};
})();
</script>`,[pixelId,trackPixel,trackCheckout]);
 const utm="utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.id}}&utm_term={{adset.name}}";
 const [utmCopied,setUtmCopied]=useState(false);
 const copyUtm=async()=>{try{await navigator.clipboard.writeText(utm);setUtmCopied(true);}catch{}};
 const copy=async()=>{try{await navigator.clipboard.writeText(snippet);setCopied(true);}catch{setPreview(true);}};
 return <section className="trackup-ops-surface space-y-4"><div className="trackup-page-heading"><div><p className="trackup-overline">SCRIPT ÚNICO DE RASTREAMENTO</p><h2>Instalar pixel do TrackUp</h2><p>Um código reutilizável para instalar uma vez no cabeçalho do site, não em cada página individualmente.</p></div><Code2 size={23} className="text-blue-700"/></div>
 <p className="text-xs text-slate-600">Ele registra visitas, UTMs, identificação de sessão, cliques de checkout e eventos de comportamento. Quando informado, inicia também o pixel Meta escolhido. O token da API de Conversões deve ficar somente no servidor.</p>
 <label className="block max-w-md text-xs font-bold text-slate-600">ID do pixel Meta (opcional)<input inputMode="numeric" value={pixelId} onChange={e=>setPixelId(e.target.value.trim())} placeholder="Ex.: 123456789012345" className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
 {!validPixel&&<p className="text-xs text-rose-700">Informe somente números (10 a 25 dígitos).</p>}
 <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={trackCheckout} onChange={e=>setTrackCheckout(e.target.checked)}/> Registrar links de checkout e propagar UTMs</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={trackPixel} onChange={e=>setTrackPixel(e.target.checked)}/> Carregar pixel Meta (quando informado)</label></div>
 <div className="flex flex-wrap gap-2"><button disabled={!validPixel} type="button" onClick={copy} className="trackup-action"><Clipboard size={15}/>{copied?"Copiado!":"Copiar script completo"}</button><button type="button" className="trackup-action-secondary" onClick={()=>setPreview(v=>!v)}>{preview?<EyeOff size={15}/>:<Eye size={15}/>} {preview?"Ocultar código":"Visualizar código"}</button></div>
 {preview&&<textarea aria-label="Script gerado" readOnly value={snippet} rows={15} className="block w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[11px] text-emerald-200" onFocus={e=>e.target.select()}/>}
 <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="font-bold text-slate-800">UTM padrão para anúncios Facebook</h3><p className="mt-1 text-xs text-slate-600">Cole o texto em Parâmetros de URL no Gerenciador de Anúncios. O ID do anúncio em utm_content facilita a atribuição.</p><code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-blue-800">{utm}</code><button type="button" onClick={copyUtm} className="trackup-action-secondary mt-3"><Clipboard size={14}/>{utmCopied?"UTM copiada":"Copiar UTM"}</button></div>
 <p className="text-xs text-amber-700">Antes de usar, teste em um site de homologação. Se já existe Pixel Meta, instale apenas uma inicialização para cada ID; duplicações prejudicam as métricas. Respeite consentimento e política de privacidade aplicáveis. Links de checkout não reconhecidos podem precisar de marcação manual com <code>data-trackup="checkout"</code>.</p>
 <p className="text-xs text-slate-500">O script preserva parâmetros UTM existentes no checkout e não incorpora tokens secretos. Não garante atribuição de vendas sem que os webhooks de pagamento estejam conectados.</p>
 </section>;
}
