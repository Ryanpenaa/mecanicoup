import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrackUpChat } from "../components/TrackUpChat";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  Gauge,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const DASHBOARD_ENDPOINT =
  "https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/tracking-dashboard";
const STORAGE_KEY = "trackup_dashboard_key";
const ADS_ENDPOINT = "https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/meta-ads-insights";
type AdRow = {ad_id:string;ad_name:string;campaign_id:string;campaign_name:string;adset_id:string;adset_name:string;spend:string;clicks:string;impressions:string;reach?:string;frequency?:string;inline_link_clicks?:string;actions?:{action_type:string;value:string}[];action_values?:{action_type:string;value:string}[]};
type AdLevel = "campaign" | "adset" | "ad";
type MetaAccount = {id:string;account_id:string;name:string;business?:{id:string;name:string}};
function MetaAdsPanel({dashboardKey,date}:{dashboardKey:string;date:string}) {
  const [accounts,setAccounts]=useState<MetaAccount[]>([]);
  const [businesses,setBusinesses]=useState<{id:string;name:string}[]>([]);
  const [loadingBms,setLoadingBms]=useState(true);
  const [selectedAccount,setSelectedAccount]=useState("");
  const [selectedBm,setSelectedBm]=useState("");
  const [level,setLevel]=useState<AdLevel>("campaign");
  const [selectedCampaign,setSelectedCampaign]=useState("");
  const [selectedAdset,setSelectedAdset]=useState("");

  const columnOptions = [
    {key:"spend",label:"Gasto"},{key:"impressions",label:"Impressões"},{key:"reach",label:"Alcance"},{key:"frequency",label:"Frequência"},
    {key:"clicks",label:"Cliques (todos)"},{key:"link_clicks",label:"Cliques no link"},{key:"cpc",label:"CPC (todos)"},{key:"link_cpc",label:"CPC no link"},
    {key:"ctr",label:"CTR (todos)"},{key:"link_ctr",label:"CTR no link"},{key:"cpm",label:"CPM"},
    {key:"landing_views",label:"Visualizações da página de destino"},{key:"cost_landing",label:"Custo por visualização"},
    {key:"initiate_checkout",label:"Checkouts iniciados"},{key:"purchases",label:"Compras (Meta)"},{key:"purchase_value",label:"Valor de compras (Meta)"},
    {key:"cost_purchase",label:"Custo por compra"},{key:"roas",label:"ROAS (Meta)"}
  ];
  const [columns,setColumns]=useState<string[]>(()=>{try{const v=JSON.parse(localStorage.getItem("trackup_meta_columns")||"null");return Array.isArray(v)?v:["spend","impressions","clicks","cpc","ctr","landing_views","purchases"]; }catch{return ["spend","impressions","clicks","cpc","ctr","landing_views","purchases"];}});
  const [configure,setConfigure]=useState(false);
  const setColumn=(key:string,enabled:boolean)=>{const next=enabled?[...columns,key]:columns.filter(c=>c!==key);setColumns(next);try{localStorage.setItem("trackup_meta_columns",JSON.stringify(next));}catch{}};

  const [rows,setRows]=useState<AdRow[]>([]);
  const [message,setMessage]=useState("Selecione uma BM e uma conta de anúncios.");
  const [busy,setBusy]=useState(false);
  const [currency,setCurrency]=useState("BRL");
  const [fxRate,setFxRate]=useState<number|null>(1);
  const [fxDate,setFxDate]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    fetch(ADS_ENDPOINT+"?action=accounts",{headers:{"x-dashboard-key":dashboardKey}})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||"Erro ao consultar contas.");return d;})
      .then(d=>{if(active){setAccounts(d.accounts||[]);setBusinesses(d.businesses||[]);setLoadingBms(false);if(!(d.businesses||[]).length)setMessage("Nenhuma BM retornada. Confira as permissões do token na Meta.");}})
      .catch(e=>{if(active){setLoadingBms(false);setMessage(e instanceof Error?e.message:"Erro ao consultar contas.");}});
    return ()=>{active=false;};
  },[dashboardKey]);

  const filtered=accounts.filter(a=>selectedBm==="unassigned"?!a.business:a.business?.id===selectedBm);
  const campaigns=Array.from(new Map(rows.filter(r=>r.campaign_id).map(r=>[r.campaign_id,{id:r.campaign_id,name:r.campaign_name||r.campaign_id}])).values()).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const adsets=Array.from(new Map(rows.filter(r=>r.adset_id&&(!selectedCampaign||r.campaign_id===selectedCampaign)).map(r=>[r.adset_id,{id:r.adset_id,name:r.adset_name||r.adset_id}])).values()).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const scopedRows=rows.filter(r=>(!selectedCampaign||r.campaign_id===selectedCampaign)&&(!selectedAdset||r.adset_id===selectedAdset));
  const changeCampaign=(id:string)=>{setSelectedCampaign(id);setSelectedAdset("");if(id)setLevel("adset");};
  const resetHierarchy=()=>{setSelectedCampaign("");setSelectedAdset("");setLevel("campaign");};

  const load=async()=>{
    setBusy(true);
    setRows([]);
    resetHierarchy();
    try {
      const url=ADS_ENDPOINT+"?date="+encodeURIComponent(date)+"&account_id="+encodeURIComponent(selectedAccount);
      const res=await fetch(url,{headers:{"x-dashboard-key":dashboardKey}});
      const data=await res.json();
      if(!res.ok)throw new Error(data.detail||data.error||"Falha na consulta.");
      setCurrency(typeof data.currency==="string"?data.currency:"UNKNOWN");
      setFxRate(typeof data.fx_rate_brl==="number"?data.fx_rate_brl:null);
      setFxDate(data.fx_date||null);
      setRows(data.ads||[]);
      setMessage((data.ads||[]).length+" anúncios encontrados em "+date+".");
    } catch(e) {setMessage(e instanceof Error?e.message:"Não foi possível consultar a Meta.");}
    finally {setBusy(false);}
  };
  const metrics=new Map<string,{id:string;name:string;spend:number;clicks:number;impressions:number;link_clicks:number;reach:number;actions:Record<string,number>;values:Record<string,number>;count:number}>();
  const getAction=(obj:Record<string,number>,keys:string[])=>keys.reduce((sum,key)=>sum+(obj[key]||0),0);
  for(const item of scopedRows){
    const id=level==="campaign"?item.campaign_id:level==="adset"?item.adset_id:item.ad_id;
    const name=level==="campaign"?item.campaign_name:level==="adset"?item.adset_name:item.ad_name;
    if(!id)continue;
    const m=metrics.get(id)||{id,name:name||id,spend:0,clicks:0,impressions:0,link_clicks:0,reach:0,actions:{},values:{},count:0};
    m.spend+=Number(item.spend)||0;m.clicks+=Number(item.clicks)||0;m.impressions+=Number(item.impressions)||0;
    m.link_clicks+=Number(item.inline_link_clicks)||0;m.reach+=Number(item.reach)||0;m.count++;
    for(const a of item.actions||[])m.actions[a.action_type]=(m.actions[a.action_type]||0)+(Number(a.value)||0);
    for(const a of item.action_values||[])m.values[a.action_type]=(m.values[a.action_type]||0)+(Number(a.value)||0);
    metrics.set(id,m);
  }
  const report=Array.from(metrics.values()).sort((a,b)=>b.spend-a.spend);
  const metric=(m:typeof report[number],key:string):string=>{
    const landing=getAction(m.actions,["landing_page_view"]);
    const checkout=m.actions["omni_initiated_checkout"]??m.actions["initiate_checkout"]??0;
    const purchases=m.actions["omni_purchase"]??m.actions["purchase"]??0;
    const value=m.values["omni_purchase"]??m.values["purchase"]??0;
    const money=(v:number)=>fxRate===null?currency==="UNKNOWN"?v.toFixed(2)+" (moeda não identificada)":formatMoney(v,currency):formatMoney(v*fxRate,"BRL");
    const number=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v);
    switch(key){
      case "spend":return money(m.spend);
      case "impressions":return number(m.impressions);
      case "reach":return m.count===1?number(m.reach):"—";
      case "frequency":return m.count===1&&m.reach?number(m.impressions/m.reach):"—";
      case "clicks":return number(m.clicks);
      case "link_clicks":return number(m.link_clicks);
      case "cpc":return m.clicks?money(m.spend/m.clicks):"—";
      case "link_cpc":return m.link_clicks?money(m.spend/m.link_clicks):"—";
      case "ctr":return m.impressions?number(m.clicks/m.impressions*100)+"%":"—";
      case "link_ctr":return m.impressions?number(m.link_clicks/m.impressions*100)+"%":"—";
      case "cpm":return m.impressions?money(m.spend/m.impressions*1000):"—";
      case "landing_views":return number(landing);
      case "cost_landing":return landing?money(m.spend/landing):"—";
      case "initiate_checkout":return number(checkout);
      case "purchases":return number(purchases);
      case "purchase_value":return money(value);
      case "cost_purchase":return purchases?money(m.spend/purchases):"—";
      case "roas":return m.spend?number(value/m.spend)+"x":"—";
      default:return "—";
    }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <div><h2 className="text-xl font-bold">Meta Ads — Gerenciador de anúncios</h2><p className="text-sm text-slate-500">Consulta de campanhas, conjuntos e anúncios · somente leitura.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Business Manager
        <select aria-label="Business Manager" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2" value={selectedBm} onChange={e=>{setSelectedBm(e.target.value);setSelectedAccount("");setRows([]);resetHierarchy();}}>
          <option value="">{loadingBms?"Carregando BMs...":"Escolha uma BM"}</option>
          {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          {accounts.some(a=>!a.business)&&<option value="unassigned">Contas sem BM vinculada</option>}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">Conta de anúncios
        <select aria-label="Conta de anúncios" disabled={!selectedBm} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-50" value={selectedAccount} onChange={e=>{setSelectedAccount(e.target.value);setRows([]);resetHierarchy();}}>
          <option value="">Escolha a conta de anúncios</option>
          {filtered.map(a=><option key={a.id} value={a.account_id}>{a.name} ({a.account_id})</option>)}
        </select>
      </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">{message}</p>
      <button type="button" disabled={busy||!selectedAccount} onClick={load} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?"Consultando...":"Consultar Meta Ads"}</button>
    </div>
    {rows.length>0&&<>
      <p className="text-xs font-semibold text-slate-600">{fxRate===null?"Cotação indisponível: valores exibidos na moeda original ("+currency+"), sem conversão.":currency==="BRL"?"Conta em BRL: valores em reais, sem conversão.":"Valores convertidos de "+currency+" para BRL pela cotação de "+(fxDate||date)+" (1 "+currency+" = "+fxRate.toFixed(4)+" BRL). Cotação de referência; pode diferir da cobrança Meta."}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Filtrar campanha
          <select aria-label="Filtrar campanha" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2" value={selectedCampaign} onChange={e=>changeCampaign(e.target.value)}>
            <option value="">Todas as campanhas</option>
            {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Filtrar conjunto
          <select aria-label="Filtrar conjunto" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2" value={selectedAdset} onChange={e=>{setSelectedAdset(e.target.value);if(e.target.value)setLevel("ad");}}>
            <option value="">Todos os conjuntos{selectedCampaign?" da campanha":""}</option>
            {adsets.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{selectedCampaign?"Campanha filtrada":"Todas as campanhas"} · {selectedAdset?"Conjunto filtrado":"Todos os conjuntos"} · {scopedRows.length} anúncios no período</span>
        {(selectedCampaign||selectedAdset)&&<button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={resetHierarchy}>Limpar filtros</button>}
      </div>
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {([{key:"campaign",label:"Campanhas"},{key:"adset",label:"Conjuntos"},{key:"ad",label:"Anúncios"}] as {key:AdLevel;label:string}[]).map(item=>
          <button type="button" key={item.key} onClick={()=>setLevel(item.key)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${level===item.key?"bg-slate-950 text-white":"text-slate-700 hover:bg-white"}`}>{item.label}</button>
        )}
      </div>
      <div className="flex justify-end"><button type="button" onClick={()=>setConfigure(!configure)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Personalizar colunas</button></div>
      {configure&&<div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-4">{columnOptions.map(c=><label key={c.key} className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={columns.includes(c.key)} onChange={e=>setColumn(c.key,e.target.checked)}/>{c.label}</label>)}</div>}
      <p className="text-xs text-slate-500">Compras, checkouts e ROAS desta tabela são métricas atribuídas pela Meta, não as vendas confirmadas pela Vega. Alcance e frequência são exibidos apenas no nível de anúncio para evitar somas incorretas.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">{level==="campaign"?"Campanha":level==="adset"?"Conjunto":"Anúncio"}</th>{columnOptions.filter(c=>columns.includes(c.key)).map(c=><th key={c.key} className="whitespace-nowrap p-2">{c.label}</th>)}</tr></thead>
      <tbody>{report.map(row=><tr key={row.id} className="border-b"><td className="p-2">{level==="ad"?row.name:<button type="button" className="text-left font-semibold text-blue-700 hover:underline" onClick={()=>{if(level==="campaign")changeCampaign(row.id);else {setSelectedAdset(row.id);setLevel("ad");}}}>{row.name}</button>}</td>{columnOptions.filter(c=>columns.includes(c.key)).map(c=><td key={c.key} className="whitespace-nowrap p-2">{metric(row,c.key)}</td>)}</tr>)}</tbody></table></div>
    </>}
  </section>;
}

type FbcStatus = "ok" | "missing" | "mismatch" | "present";

type Transaction = {
  transaction_token: string;
  sale_code: string | null;
  tracking_id: string | null;
  tracking_matched: boolean;
  status: string;
  method: string | null;
  value: number | null;
  currency: string;
  approved_at: string | null;
  approved_received_at: string | null;
  first_received_at: string | null;
  last_received_at: string | null;
  webhook_delay_seconds: number | null;
  product_id: string | null;
  product_name: string | null;
  product_key: string | null;
  offer_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbc_status: FbcStatus;
  has_fbp: boolean;
  purchase_sent_by_trackup: boolean;
  purchase_sent_at: string | null;
  meta_purchase_error: string | null;
  meta_purchase_attempts: number;
  meta_purchase_last_attempt_at: string | null;
  meta_event_id: string | null;
};

type TrafficSummary = {
  visits: number;
  engaged_15s: number;
  scroll_50: number;
  scroll_75: number;
  view_plans: number;
  select_plan: number;
  checkout_click: number;
  pix_generated: number;
  purchases: number;
};

type CreativeQuality = {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  visits: number;
  engaged_15s: number;
  view_plans: number;
  select_plan: number;
  checkout_click: number;
  pix_generated: number;
  purchases: number;
};

type DashboardResponse = {
  ok: boolean;
  generated_at: string;
  meta_capi_enabled: boolean;
  meta_pixel_id?: string | null;
  rows: Transaction[];
  traffic?: {
    summary: TrafficSummary;
    creatives: CreativeQuality[];
  };
};

function formatMoney(value: number | null, currency = "BRL") {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

const DASHBOARD_TIME_ZONE = "America/Porto_Velho";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    timeZone: DASHBOARD_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function dateKeyInPortoVelho(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function todayDateKey() {
  return dateKeyInPortoVelho(new Date());
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function transactionDateKey(row: Transaction) {
  const value =
    row.status === "approved"
      ? row.approved_at ?? row.approved_received_at ?? row.last_received_at
      : row.first_received_at ?? row.last_received_at;
  return value ? dateKeyInPortoVelho(value) : "";
}

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatDelay(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized === "refused" || normalized === "expired") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function fbcTone(status: FbcStatus) {
  if (status === "ok") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "present") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "missing") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function fbcLabel(status: FbcStatus) {
  if (status === "ok") return "fbc OK";
  if (status === "present") return "fbc presente";
  if (status === "missing") return "sem fbc";
  return "fbc divergente";
}

function delayTone(seconds: number | null) {
  if (seconds === null) return "text-slate-400";
  if (seconds <= 10) return "text-emerald-600";
  if (seconds <= 60) return "text-amber-600";
  return "text-red-600";
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({
  name,
  detail,
  status,
  icon: Icon,
}: {
  name: string;
  detail: string;
  status: "connected" | "off";
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ring-1 ring-inset ${
            status === "connected"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {status === "connected" ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {status === "connected" ? "CONECTADO" : "DESATIVADO"}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{name}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Unlock({
  onUnlock,
}: {
  onUnlock: (key: string) => Promise<boolean>;
}) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setInvalid(false);
    const ok = await onUnlock(key.trim());
    setLoading(false);
    setInvalid(!ok);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
          <Gauge className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
          TrackUp
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Painel protegido para acompanhar os webhooks reais do Vega/AppMax sem
          enviar nenhum Purchase novo para a Meta.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Chave do painel
          </label>
          <div className="relative mt-2">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              placeholder="Cole a chave de acesso"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            />
          </div>
          {invalid && (
            <p className="mt-2 text-xs font-medium text-red-400">
              Chave incorreta ou serviço indisponível.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Entrar no painel
          </button>
        </form>
      </div>
    </div>
  );
}

function Index() {
  const [dashboardKey, setDashboardKey] = useState<string | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [metaCapiEnabled, setMetaCapiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("approved");
  const [selectedDate, setSelectedDate] = useState(() => todayDateKey());
  const [activeTab, setActiveTab] = useState<"transactions" | "traffic" | "ads">("transactions");
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary>({
    visits: 0,
    engaged_15s: 0,
    scroll_50: 0,
    scroll_75: 0,
    view_plans: 0,
    select_plan: 0,
    checkout_click: 0,
    pix_generated: 0,
    purchases: 0,
  });
  const [creativeQuality, setCreativeQuality] = useState<CreativeQuality[]>([]);

  async function fetchDashboard(key: string, quiet = false) {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch(
        `${DASHBOARD_ENDPOINT}?date=${encodeURIComponent(selectedDate)}`,
        {
        headers: {
          "x-dashboard-key": key,
        },
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setDashboardKey(null);
        return false;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as DashboardResponse;
      if (!body.ok) throw new Error("Resposta inválida");

      setRows(body.rows ?? []);
      setMetaCapiEnabled(Boolean(body.meta_capi_enabled));
      setTrafficSummary(
        body.traffic?.summary ?? {
          visits: 0,
          engaged_15s: 0,
          scroll_50: 0,
          scroll_75: 0,
          view_plans: 0,
          select_plan: 0,
          checkout_click: 0,
          pix_generated: 0,
          purchases: 0,
        },
      );
      setCreativeQuality(body.traffic?.creatives ?? []);
      setGeneratedAt(body.generated_at ?? null);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados");
      return false;
    } finally {
      setLoading(false);
      if (!quiet) setRefreshing(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    setDashboardKey(saved);
    void fetchDashboard(saved);
  }, []);

  useEffect(() => {
    if (!dashboardKey) return;
    const timer = window.setInterval(() => {
      void fetchDashboard(dashboardKey, true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [dashboardKey, selectedDate]);

  useEffect(() => {
    if (!dashboardKey) return;
    void fetchDashboard(dashboardKey, true);
  }, [dashboardKey, selectedDate]);

  async function unlock(key: string) {
    const ok = await fetchDashboard(key);
    if (ok) {
      localStorage.setItem(STORAGE_KEY, key);
      setDashboardKey(key);
    }
    return ok;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setDashboardKey(null);
    setRows([]);
  }

  const dayRows = useMemo(
    () => rows.filter((row) => transactionDateKey(row) === selectedDate),
    [rows, selectedDate],
  );

  const approved = dayRows.filter((row) => row.status === "approved");
  const pending = dayRows.filter((row) => row.status === "pending");
  const problems = approved.filter(
    (row) =>
      (row.webhook_delay_seconds ?? 0) > 60 ||
      row.fbc_status === "mismatch" ||
      !row.tracking_matched,
  );

  const averageDelay = useMemo(() => {
    const values = approved
      .map((row) => row.webhook_delay_seconds)
      .filter((value): value is number => value !== null);
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [approved]);

  const revenue = approved.reduce((sum, row) => sum + (row.value ?? 0), 0);

  const filteredRows = dayRows.filter((row) =>
    statusFilter === "all" ? true : row.status === statusFilter,
  );

  if (!dashboardKey && !loading) {
    return <Unlock onUnlock={unlock} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Carregando TrackUp...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">TrackUp</h1>
              <p className="text-xs text-slate-400">
                Vega/AppMax → Supabase → Meta CAPI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                dashboardKey && void fetchDashboard(dashboardKey)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-blue-950">
                {metaCapiEnabled ? "Meta CAPI ativa" : "Modo observação ativo"}
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                {metaCapiEnabled
                  ? "Vendas approved recebidas do Vega são enviadas pelo TrackUp para a Meta com trava contra duplicação."
                  : "O TrackUp já está pronto para enviar Purchase, mas o envio permanece desligado para evitar duplicação enquanto o Vega ainda envia eventos para o mesmo Pixel."}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            Falha ao atualizar os dados: {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Data do painel
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {selectedDate === todayDateKey()
                    ? `Hoje · ${formatSelectedDate(selectedDate)}`
                    : formatSelectedDate(selectedDate)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Horário de Rondônia · America/Porto_Velho
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  event.target.value && setSelectedDate(event.target.value)
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))}
                disabled={selectedDate >= todayDateKey()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Próximo dia"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayDateKey())}
                className="h-9 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800"
              >
                Hoje
              </button>
            </div>
          </div>
        </section>

        <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "transactions"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Vendas / Webhooks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("traffic")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "traffic"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Qualidade do tráfego
          </button>
          <button type="button" onClick={() => setActiveTab("ads")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${activeTab === "ads" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Meta Ads</button>
        </div>

        {activeTab === "ads" && <MetaAdsPanel dashboardKey={dashboardKey} date={selectedDate} />}

        {activeTab === "traffic" && (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              Os dados de comportamento (15s, scroll e visualização de planos) contam a partir da ativação deste módulo. Visitas e vendas anteriores continuam aparecendo, mas sem retroagir esses eventos.
            </div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                ["Visitas", trafficSummary.visits],
                ["15s engajado", trafficSummary.engaged_15s],
                ["Scroll 50%", trafficSummary.scroll_50],
                ["Scroll 75%", trafficSummary.scroll_75],
                ["Viu planos", trafficSummary.view_plans],
                ["Selecionou plano", trafficSummary.select_plan],
                ["Clicou no checkout", trafficSummary.checkout_click],
                ["PIX gerado", trafficSummary.pix_generated],
                ["Compras", trafficSummary.purchases],
              ].map(([label, rawValue]) => {
                const value = Number(rawValue);
                return (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-2xl font-bold text-slate-950">{value}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {label === "Visitas"
                          ? "100%"
                          : formatPercent(value, trafficSummary.visits)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h2 className="font-bold text-slate-950">Funil de qualidade</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Mostra onde o tráfego do dia está perdendo força antes da compra.
                </p>
              </div>
              <div className="mt-5 grid gap-2">
                {[
                  ["Visitas", trafficSummary.visits],
                  ["15s engajado", trafficSummary.engaged_15s],
                  ["Viu planos", trafficSummary.view_plans],
                  ["Selecionou plano", trafficSummary.select_plan],
                  ["Clicou checkout", trafficSummary.checkout_click],
                  ["PIX gerado", trafficSummary.pix_generated],
                  ["Compra", trafficSummary.purchases],
                ].map(([label, rawValue]) => {
                  const value = Number(rawValue);
                  const width = trafficSummary.visits
                    ? Math.max(3, Math.round((value / trafficSummary.visits) * 100))
                    : 0;
                  return (
                    <div key={String(label)} className="grid grid-cols-[120px_1fr_70px] items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">{label}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-right text-xs font-bold text-slate-700">
                        {value} · {formatPercent(value, trafficSummary.visits)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h2 className="font-bold text-slate-950">Qualidade por criativo</h2>
                <p className="mt-1 text-sm text-slate-500">
                  UTMs do anúncio cruzadas com comportamento, PIX e compras.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5">Criativo</th>
                        <th className="px-4 py-3.5">Fonte</th>
                        <th className="px-4 py-3.5">Visitas</th>
                        <th className="px-4 py-3.5">15s</th>
                        <th className="px-4 py-3.5">Viu planos</th>
                        <th className="px-4 py-3.5">Clique checkout</th>
                        <th className="px-4 py-3.5">PIX</th>
                        <th className="px-4 py-3.5">Compras</th>
                        <th className="px-4 py-3.5">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {creativeQuality.map((row, index) => (
                        <tr key={`${row.utm_source}-${row.utm_campaign}-${row.utm_content}-${index}`}>
                          <td className="px-4 py-3.5">
                            <div className="max-w-[220px] truncate font-semibold text-slate-800">
                              {row.utm_content ?? "sem utm_content"}
                            </div>
                            <div className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                              {row.utm_campaign ?? "sem campanha"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                            {row.utm_source ?? "direto"}
                          </td>
                          <td className="px-4 py-3.5 font-bold">{row.visits}</td>
                          <td className="px-4 py-3.5">{row.engaged_15s}</td>
                          <td className="px-4 py-3.5">{row.view_plans}</td>
                          <td className="px-4 py-3.5">{row.checkout_click}</td>
                          <td className="px-4 py-3.5">{row.pix_generated}</td>
                          <td className="px-4 py-3.5 font-bold text-emerald-700">{row.purchases}</td>
                          <td className="px-4 py-3.5 font-bold">
                            {formatPercent(row.purchases, row.visits)}
                          </td>
                        </tr>
                      ))}
                      {!creativeQuality.length && (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                            Ainda não há tráfego registrado nesta data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "transactions" && (
          <>
        <section className="grid gap-4 md:grid-cols-3">
          <ConnectionCard
            name="Vega / AppMax"
            detail="Webhook real de transações está chegando ao nosso receptor."
            status="connected"
            icon={ShoppingCart}
          />
          <ConnectionCard
            name="Supabase"
            detail="Banco está armazenando sessão, status, horários e UTMs."
            status="connected"
            icon={Database}
          />
          <ConnectionCard
            name="Meta CAPI"
            detail={
              metaCapiEnabled
                ? "TrackUp envia Purchase aprovado diretamente para o Pixel, com event_id único por transação."
                : "Integração pronta, mas desligada até removermos o Purchase do Vega."
            }
            status={metaCapiEnabled ? "connected" : "off"}
            icon={Zap}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Vendas aprovadas"
            value={String(approved.length)}
            detail={`No dia ${selectedDate.split("-").reverse().join("/")}`}
            icon={CheckCircle2}
          />
          <Metric
            label="Receita aprovada"
            value={formatMoney(revenue)}
            detail="Somente status approved"
            icon={ShoppingCart}
          />
          <Metric
            label="Atraso Vega → TrackUp"
            value={formatDelay(averageDelay)}
            detail="Aprovação → webhook recebido"
            icon={Clock3}
          />
          <Metric
            label="Alertas"
            value={String(problems.length)}
            detail="Atraso > 60s, fbc divergente ou sessão sem vínculo"
            icon={AlertTriangle}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-950">
                  O que este estágio já prova
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estamos medindo o trecho antes da Meta sem interferir nele.
                </p>
              </div>
              <Server className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Pagamento
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Vega aprova a transação
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Webhook
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  TrackUp registra quando recebeu
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Comparação
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Se aqui é rápido e Meta atrasa, o gargalo está depois
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-slate-950">Situação atual</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leitura das transações recebidas.
                </p>
              </div>
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-sm font-medium text-emerald-800">
                  Aprovadas
                </span>
                <span className="font-bold text-emerald-900">{approved.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                <span className="text-sm font-medium text-amber-800">
                  Pendentes
                </span>
                <span className="font-bold text-amber-900">{pending.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">
                  Total no dia
                </span>
                <span className="font-bold text-slate-900">{dayRows.length}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Transações reais</h2>
              <p className="mt-1 text-sm text-slate-500">
                Horário de aprovação no Vega comparado ao momento em que nosso
                webhook recebeu a aprovação.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["approved", "Aprovadas"],
                ["pending", "Pendentes"],
                ["all", "Todas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    statusFilter === value
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Transação</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 font-semibold">Valor</th>
                    <th className="px-4 py-3.5 font-semibold">Vega aprovou</th>
                    <th className="px-4 py-3.5 font-semibold">
                      TrackUp recebeu aprovação
                    </th>
                    <th className="px-4 py-3.5 font-semibold">Atraso</th>
                    <th className="px-4 py-3.5 font-semibold">UTM / criativo</th>
                    <th className="px-4 py-3.5 font-semibold">Identificação</th>
                    <th className="px-4 py-3.5 font-semibold">Meta via TrackUp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.transaction_token}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-xs font-bold text-slate-800">
                          {row.sale_code ?? row.transaction_token}
                        </div>
                        <div className="mt-1 max-w-[170px] truncate text-[11px] text-slate-400">
                          {row.product_name ??
                            row.product_id ??
                            "produto ainda não identificado"}
                          {row.product_key ? ` · ${row.product_key}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusTone(
                            row.status,
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {formatMoney(row.value, row.currency)}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {formatDate(row.approved_at)}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {formatDate(row.approved_received_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`font-bold ${delayTone(
                            row.webhook_delay_seconds,
                          )}`}
                        >
                          {formatDelay(row.webhook_delay_seconds)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[180px] truncate text-xs font-semibold text-slate-700">
                          {row.utm_content ?? "sem utm_content"}
                        </div>
                        <div className="mt-1 max-w-[180px] truncate text-[11px] text-slate-400">
                          {row.utm_campaign ?? row.utm_source ?? "sem campanha"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${fbcTone(
                              row.fbc_status,
                            )}`}
                          >
                            {fbcLabel(row.fbc_status)}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              row.tracking_matched
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {row.tracking_matched
                              ? "sessão vinculada"
                              : "sem tracking_id válido"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {row.purchase_sent_by_trackup ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              enviado
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(row.purchase_sent_at)}
                            </span>
                          </div>
                        ) : row.meta_purchase_error ? (
                          <div className="flex max-w-[180px] flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              erro Meta
                            </span>
                            <span className="line-clamp-2 text-[10px] text-red-500">
                              {row.meta_purchase_error}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            <Eye className="h-3.5 w-3.5" />
                            {metaCapiEnabled ? "aguardando" : "não enviado"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        Nenhuma transação neste filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Tags className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="font-bold text-slate-950">Diagnóstico de fbc</h2>
                <p className="text-xs text-slate-500">
                  Compara o fbclid salvo com o final do fbc sem expor o código
                  completo no painel.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["ok", "present", "missing", "mismatch"] as FbcStatus[]).map(
                (status) => (
                  <div
                    key={status}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-xl font-bold text-slate-950">
                      {dayRows.filter((row) => row.fbc_status === status).length}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {fbcLabel(status)}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-slate-950">Regra de segurança</h2>
                <p className="text-xs text-slate-500">
                  Nenhum dado pessoal bruto é retornado para este painel.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
              <p>• E-mail, telefone e IP não aparecem na interface.</p>
              <p>• O painel recebe somente campos técnicos necessários ao diagnóstico.</p>
              <p>
                • Meta CAPI: {metaCapiEnabled ? "ATIVA — Purchase automático após approved." : "DESLIGADA — pronta para ativação segura."}
              </p>
            </div>
          </div>
        </section>

          </>
        )}

        <footer className="flex flex-col gap-1 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>TrackUp · diagnóstico de rastreamento</span>
          <span>
            Atualização automática a cada 10s
            {generatedAt ? ` · servidor: ${formatDate(generatedAt)}` : ""}
          </span>
        </footer>
      </main>
      {dashboardKey && (
        <TrackUpChat
          dashboardKey={dashboardKey}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
