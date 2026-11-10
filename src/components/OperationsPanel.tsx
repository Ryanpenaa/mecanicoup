import { useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Download, Filter, Link2, Search, ShieldAlert, ShoppingBag, Wifi } from "lucide-react";

export type OperationalSale = {
  transaction_token: string;
  sale_code: string | null;
  source_platform?: "vega" | "appmax";
  status: string;
  product_name: string | null;
  tracking_matched: boolean;
  purchase_sent_by_trackup: boolean;
  meta_purchase_error: string | null;
  meta_purchase_attempts: number;
  meta_purchase_last_attempt_at: string | null;
  purchase_sent_at: string | null;
  webhook_delay_seconds: number | null;
  fbc_status: string;
  approved_at: string | null;
  first_received_at: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

type FilterValue = "all" | "error" | "unattributed" | "not-sent" | "sent";
const formatTime = (time: string | null) => {
  if (!time) return "—";
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? time : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Porto_Velho" }).format(date);
};
const cell = (value: unknown) => '"'+String(value ?? "").replace(/"/g, '""')+'"';

export function OperationsPanel({ rows, date, metaCapiEnabled, generatedAt, onOpenSales, onRefresh, refreshing }: {
  rows: OperationalSale[];
  date: string;
  metaCapiEnabled: boolean;
  generatedAt: string | null;
  onOpenSales: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const approved = useMemo(() => rows.filter(row => row.status === "approved"), [rows]);
  const stats = useMemo(() => ({
    received: approved.length,
    attributed: approved.filter(row => row.tracking_matched).length,
    sent: approved.filter(row => row.purchase_sent_by_trackup).length,
    failed: approved.filter(row => Boolean(row.meta_purchase_error)).length,
    unattributed: approved.filter(row => !row.tracking_matched).length,
    notSent: approved.filter(row => !row.purchase_sent_by_trackup).length,
    platforms: [...new Set(rows.map(row => row.source_platform || "vega"))],
  }), [approved, rows]);
  const visible = approved.filter(row => {
    const match = filter === "all" ||
      (filter === "error" && Boolean(row.meta_purchase_error)) ||
      (filter === "unattributed" && !row.tracking_matched) ||
      (filter === "not-sent" && !row.purchase_sent_by_trackup) ||
      (filter === "sent" && row.purchase_sent_by_trackup);
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return match && (!term || [row.sale_code, row.transaction_token, row.product_name, row.utm_campaign, row.utm_content].some(field => String(field ?? "").toLocaleLowerCase("pt-BR").includes(term)));
  });
  const exportCsv = () => {
    const headers = ["Pedido", "Plataforma", "Produto", "Rastreamento associado", "Envio registrado pelo TrackUp", "Erro Meta", "Tentativas", "Última tentativa", "Data"];
    const csv = "\uFEFF" + [headers.map(cell).join(";"), ...visible.map(row => [
      row.sale_code || row.transaction_token, row.source_platform || "vega", row.product_name,
      row.tracking_matched ? "Sim" : "Não", row.purchase_sent_by_trackup ? "Sim" : "Não",
      row.meta_purchase_error, row.meta_purchase_attempts, formatTime(row.meta_purchase_last_attempt_at), formatTime(row.approved_at)
    ].map(cell).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "trackup-monitoramento-"+date+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const cards = [
    { title: "Compras aprovadas", value: stats.received, note: "Registradas neste dia", icon: ShoppingBag },
    { title: "Com rastreamento", value: stats.attributed, note: "Sessão associada", icon: Link2 },
    { title: "Envio registrado", value: stats.sent, note: "TrackUp → Meta; não é confirmação de atribuição", icon: CheckCircle2 },
    { title: "Erros reportados", value: stats.failed, note: "Resposta de erro armazenada", icon: AlertCircle }
  ];
  return <div className="trackup-operations space-y-5">
    <div className="trackup-page-heading">
      <div><p className="trackup-overline">CONTROLE DE RASTREAMENTO</p><h2>Central de operações</h2><p>Conciliação de vendas, integridade das UTMs e histórico de tentativas de envio para a Meta.</p></div>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="trackup-action"><Activity size={16}/>{refreshing ? "Atualizando..." : "Atualizar dados"}</button>
    </div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de monitoramento">
      {cards.map(card=><div key={card.title} className="trackup-metric-card">
        <div className="flex items-center justify-between"><span>{card.title}</span><card.icon size={19}/></div>
        <strong>{card.value.toLocaleString("pt-BR")}</strong><small>{card.note}</small>
      </div>)}
    </section>
    <section className="trackup-ops-surface">
      <h3 className="text-base font-bold text-slate-900">Integrações e observabilidade</h3>
      <p className="mt-1 text-xs text-slate-500">Estes indicadores são baseados nos pedidos presentes na consulta. Não constituem um teste direto da disponibilidade dos servidores externos.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="trackup-connection"><ShoppingBag size={18}/><div><strong>Webhooks de pagamentos</strong><small>{stats.platforms.length ? "Origens observadas: "+stats.platforms.join(", ") : "Sem origem identificada na seleção"}</small></div></div>
        <div className="trackup-connection"><Link2 size={18}/><div><strong>Vínculo UTMs</strong><small>{stats.unattributed} {stats.unattributed === 1 ? "compra sem sessão associada" : "compras sem sessão associada"}</small></div></div>
        <div className="trackup-connection"><Wifi size={18}/><div><strong>Meta Conversions API</strong><small>{metaCapiEnabled ? "Envio pelo TrackUp configurado como ativo" : "Envio pelo TrackUp indicado como desativado"} · {stats.notSent} sem marca de envio</small></div></div>
      </div>
      <p className="mt-3 text-xs text-amber-700"><ShieldAlert size={14} className="mr-1 inline"/>Uma compra sem marca de envio pelo TrackUp pode ter sido enviada por outra integração. Não reenvie sem verificar o event_id para evitar duplicações.</p>
    </section>
    <section className="trackup-ops-surface">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Alertas e eventos</h3><p className="text-xs text-slate-500">Dados da seleção: {date.split("-").reverse().join("/")} · Última geração: {formatTime(generatedAt)}</p></div><div className="flex gap-2"><button type="button" className="trackup-action-secondary" onClick={onOpenSales}>Ver todas as vendas <ArrowRight size={15}/></button><button type="button" className="trackup-action-secondary" onClick={exportCsv}><Download size={15}/> Exportar CSV</button></div></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="trackup-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido, produto ou UTM" aria-label="Buscar ocorrências"/></label>
        <label className="trackup-ops-filter"><Filter size={15}/><select aria-label="Filtrar ocorrências" value={filter} onChange={e=>setFilter(e.target.value as FilterValue)}><option value="all">Todas as aprovadas</option><option value="error">Com erro Meta</option><option value="unattributed">Sem rastreamento</option><option value="not-sent">Sem envio TrackUp</option><option value="sent">Envio registrado</option></select></label>
      </div>
      <div className="mt-4 max-w-full overflow-x-auto"><table className="trackup-ops-table w-full text-left"><thead><tr><th>Pedido</th><th>Plataforma</th><th>Rastreamento</th><th>Envio TrackUp</th><th>Erro / observação</th><th>Última tentativa</th></tr></thead><tbody>
        {visible.map(row=><tr key={row.transaction_token}><td><strong className="block max-w-40 truncate" title={row.sale_code || row.transaction_token}>{row.sale_code || row.transaction_token}</strong><small className="block max-w-40 truncate">{row.product_name || "Produto não identificado"}</small></td><td>{row.source_platform || "vega"}</td><td>{row.tracking_matched ? "Associado" : "Sem sessão"}</td><td>{row.purchase_sent_by_trackup ? "Registrado" : "Sem registro"}</td><td className={row.meta_purchase_error ? "text-rose-700" : "text-slate-500"}>{row.meta_purchase_error || (row.fbc_status==="mismatch" ? "FBC divergente" : "—")}</td><td>{formatTime(row.meta_purchase_last_attempt_at)}</td></tr>)}
        {!visible.length&&<tr><td colSpan={6} className="py-10 text-center text-slate-500">Nenhuma venda encontrada com esse filtro.</td></tr>}
      </tbody></table></div>
      <p className="mt-3 text-xs text-slate-500">A tabela apresenta status registrados no banco. “Enviado” significa marcado pelo TrackUp, não garante que a compra tenha aparecido ou sido atribuída no Gerenciador de Anúncios.</p>
    </section>
  </div>;
}
