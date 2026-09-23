import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  Download,
  Gauge,
  LayoutDashboard,
  Menu,
  PackageCheck,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/")({
  component: Index,
});

type Section = "dashboard" | "sales" | "events" | "diagnostics";
type OfferFilter = "all" | "carros" | "motos";

type Sale = {
  id: string;
  product: "carros" | "motos";
  productName: string;
  customer: string;
  value: number;
  paidAt: string;
  webhookAt: string;
  metaAt: string | null;
  delaySeconds: number | null;
  utmContent: string;
  campaign: string;
  eventId: string;
  fbc: "ok" | "missing" | "invalid";
  metaStatus: "sent" | "delayed" | "failed";
};

const sales: Sale[] = [
  {
    id: "#10482",
    product: "carros",
    productName: "Formação Mecânico Automotivo",
    customer: "Cliente 10482",
    value: 10.9,
    paidAt: "19:08:14",
    webhookAt: "19:08:18",
    metaAt: "19:08:24",
    delaySeconds: 10,
    utmContent: "img01",
    campaign: "CARROS | BIDCAP",
    eventId: "purchase_10482",
    fbc: "ok",
    metaStatus: "sent",
  },
  {
    id: "#10481",
    product: "motos",
    productName: "Mecânica de Motos",
    customer: "Cliente 10481",
    value: 18.9,
    paidAt: "18:54:02",
    webhookAt: "18:54:05",
    metaAt: "18:54:10",
    delaySeconds: 8,
    utmContent: "video03",
    campaign: "MOTOS | TESTE",
    eventId: "purchase_10481",
    fbc: "ok",
    metaStatus: "sent",
  },
  {
    id: "#10480",
    product: "carros",
    productName: "Formação Mecânico Automotivo",
    customer: "Cliente 10480",
    value: 10.9,
    paidAt: "17:31:20",
    webhookAt: "17:31:24",
    metaAt: "18:47:51",
    delaySeconds: 4587,
    utmContent: "img01",
    campaign: "CARROS | BIDCAP",
    eventId: "purchase_10480",
    fbc: "invalid",
    metaStatus: "delayed",
  },
  {
    id: "#10479",
    product: "motos",
    productName: "Mecânica de Motos",
    customer: "Cliente 10479",
    value: 18.9,
    paidAt: "17:14:43",
    webhookAt: "17:14:46",
    metaAt: "17:14:52",
    delaySeconds: 9,
    utmContent: "ugc02",
    campaign: "MOTOS | TESTE",
    eventId: "purchase_10479",
    fbc: "ok",
    metaStatus: "sent",
  },
  {
    id: "#10478",
    product: "carros",
    productName: "Formação Mecânico Automotivo",
    customer: "Cliente 10478",
    value: 10.9,
    paidAt: "16:42:11",
    webhookAt: "16:42:17",
    metaAt: null,
    delaySeconds: null,
    utmContent: "img04",
    campaign: "CARROS | ESCALA",
    eventId: "purchase_10478",
    fbc: "missing",
    metaStatus: "failed",
  },
  {
    id: "#10477",
    product: "carros",
    productName: "Formação Mecânico Automotivo",
    customer: "Cliente 10477",
    value: 10.9,
    paidAt: "15:55:38",
    webhookAt: "15:55:42",
    metaAt: "15:55:49",
    delaySeconds: 11,
    utmContent: "img01",
    campaign: "CARROS | BIDCAP",
    eventId: "purchase_10477",
    fbc: "ok",
    metaStatus: "sent",
  },
];

const chartData = [
  { time: "08h", vendas: 2, meta: 2 },
  { time: "10h", vendas: 4, meta: 4 },
  { time: "12h", vendas: 3, meta: 2 },
  { time: "14h", vendas: 5, meta: 5 },
  { time: "16h", vendas: 4, meta: 3 },
  { time: "18h", vendas: 6, meta: 5 },
  { time: "20h", vendas: 3, meta: 3 },
];

const navItems: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: ShoppingCart },
  { id: "events", label: "Eventos", icon: Activity },
  { id: "diagnostics", label: "Diagnóstico", icon: ShieldCheck },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function delayLabel(seconds: number | null) {
  if (seconds === null) return "Não enviado";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function offerLabel(product: "carros" | "motos") {
  return product === "carros" ? "Mecânica Carros" : "Mecânica Motos";
}

function StatusBadge({ status }: { status: Sale["metaStatus"] }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Enviado
      </span>
    );
  }
  if (status === "delayed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock3 className="h-3.5 w-3.5" />
        Atrasado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Falhou
    </span>
  );
}

function FbcBadge({ status }: { status: Sale["fbc"] }) {
  const styles =
    status === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "missing"
        ? "bg-slate-100 text-slate-600 ring-slate-200"
        : "bg-red-50 text-red-700 ring-red-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${styles}`}>
      {status === "ok" ? "fbc OK" : status === "missing" ? "sem fbc" : "fbc inválido"}
    </span>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const iconTone = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SalesTable({ rows }: { rows: Sale[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Pedido</th>
              <th className="px-5 py-3.5 font-semibold">Oferta</th>
              <th className="px-5 py-3.5 font-semibold">Criativo</th>
              <th className="px-5 py-3.5 font-semibold">Compra</th>
              <th className="px-5 py-3.5 font-semibold">Meta</th>
              <th className="px-5 py-3.5 font-semibold">Atraso</th>
              <th className="px-5 py-3.5 font-semibold">Identificação</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((sale) => (
              <tr key={sale.id} className="transition-colors hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{sale.id}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{currency.format(sale.value)}</div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      sale.product === "carros"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {offerLabel(sale.product)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-700">{sale.utmContent}</div>
                  <div className="mt-0.5 max-w-[150px] truncate text-xs text-slate-400">{sale.campaign}</div>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  <div>{sale.paidAt}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Webhook {sale.webhookAt}</div>
                </td>
                <td className="px-5 py-4 text-slate-700">{sale.metaAt ?? "—"}</td>
                <td className="px-5 py-4">
                  <span
                    className={`font-semibold ${
                      sale.delaySeconds === null
                        ? "text-red-600"
                        : sale.delaySeconds > 300
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {delayLabel(sale.delaySeconds)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <FbcBadge status={sale.fbc} />
                  <div className="mt-1.5 max-w-[150px] truncate font-mono text-[10px] text-slate-400">
                    {sale.eventId}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={sale.metaStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyIntegrationCard() {
  const items = [
    { name: "Vega / AppMax", detail: "Webhook de pagamento", icon: ShoppingCart },
    { name: "Supabase", detail: "Banco + Edge Functions", icon: Database },
    { name: "Meta CAPI", detail: "Purchase + deduplicação", icon: Zap },
  ];

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">Integrações do MVP</p>
          <p className="mt-1 text-sm text-slate-500">Estrutura visual pronta. Próxima etapa é conectar os dados reais.</p>
        </div>
        <Settings className="h-5 w-5 text-slate-400" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.name} className="rounded-xl border border-slate-200 bg-white p-4">
            <item.icon className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              A conectar
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Index() {
  const [section, setSection] = useState<Section>("dashboard");
  const [offer, setOffer] = useState<OfferFilter>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("agora");

  const filteredSales = useMemo(
    () => sales.filter((sale) => offer === "all" || sale.product === offer),
    [offer],
  );

  const revenue = filteredSales.reduce((sum, sale) => sum + sale.value, 0);
  const sent = filteredSales.filter((sale) => sale.metaStatus === "sent").length;
  const delayed = filteredSales.filter((sale) => sale.metaStatus === "delayed").length;
  const failed = filteredSales.filter((sale) => sale.metaStatus === "failed").length;
  const validDelays = filteredSales
    .map((sale) => sale.delaySeconds)
    .filter((delay): delay is number => delay !== null);
  const averageDelay = validDelays.length
    ? Math.round(validDelays.reduce((sum, delay) => sum + delay, 0) / validDelays.length)
    : 0;

  function exportCsv() {
    const header = [
      "pedido",
      "oferta",
      "valor",
      "compra",
      "webhook",
      "meta",
      "atraso_segundos",
      "utm_content",
      "campanha",
      "event_id",
      "fbc",
      "status",
    ];
    const rows = filteredSales.map((sale) => [
      sale.id,
      sale.productName,
      String(sale.value),
      sale.paidAt,
      sale.webhookAt,
      sale.metaAt ?? "",
      String(sale.delaySeconds ?? ""),
      sale.utmContent,
      sale.campaign,
      sale.eventId,
      sale.fbc,
      sale.metaStatus,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trackup-vendas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const sectionTitle = {
    dashboard: "Visão geral",
    sales: "Vendas",
    events: "Eventos enviados",
    diagnostics: "Diagnóstico",
  }[section];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">TrackUp</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Sales Intelligence
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Monitoramento
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                  {item.id === "diagnostics" && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-950">
                      {delayed + failed}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="rounded-xl bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Painel em demonstração
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Os números atuais são dados simulados para validar a interface antes das integrações reais.
              </p>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">{sectionTitle}</h1>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    Compra → webhook → CAPI → Meta, tudo no mesmo lugar.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLastUpdated(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:inline-flex"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" />
                  Oferta
                </div>
                {[
                  { id: "all" as const, label: "Todas" },
                  { id: "carros" as const, label: "Carros" },
                  { id: "motos" as const, label: "Motos" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOffer(item.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      offer === item.id
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Última atualização: {lastUpdated}
              </div>
            </div>

            {section === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Vendas monitoradas"
                    value={String(filteredSales.length)}
                    detail={`${sent} enviadas corretamente para a Meta`}
                    icon={PackageCheck}
                    tone="blue"
                  />
                  <MetricCard
                    title="Receita rastreada"
                    value={currency.format(revenue)}
                    detail="Vega/AppMax → painel"
                    icon={CircleDollarSign}
                    tone="green"
                  />
                  <MetricCard
                    title="Atraso médio CAPI"
                    value={delayLabel(averageDelay)}
                    detail="Compra → recebimento na Meta"
                    icon={Clock3}
                    tone={averageDelay > 300 ? "amber" : "green"}
                  />
                  <MetricCard
                    title="Eventos com atenção"
                    value={String(delayed + failed)}
                    detail={`${delayed} atrasados · ${failed} não enviados`}
                    icon={AlertTriangle}
                    tone={delayed + failed > 0 ? "amber" : "green"}
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-slate-950">Vendas x eventos recebidos pela Meta</h2>
                        <p className="mt-1 text-sm text-slate-500">Identifique visualmente quando a Meta começa a ficar para trás.</p>
                      </div>
                      <div className="hidden items-center gap-4 text-xs font-medium text-slate-500 sm:flex">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Vendas
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          Meta
                        </span>
                      </div>
                    </div>
                    <div className="h-[290px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="metaFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.16} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 10px 30px rgba(15,23,42,.08)",
                            }}
                          />
                          <Area type="monotone" dataKey="vendas" stroke="#10b981" strokeWidth={2.5} fill="url(#salesFill)" />
                          <Area type="monotone" dataKey="meta" stroke="#3b82f6" strokeWidth={2.5} fill="url(#metaFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-bold text-slate-950">Saúde do rastreamento</h2>
                        <p className="mt-1 text-sm text-slate-500">Qualidade dos eventos recentes.</p>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="mt-6 space-y-5">
                      {[
                        {
                          label: "Eventos enviados",
                          value: filteredSales.length ? Math.round((sent / filteredSales.length) * 100) : 0,
                          detail: `${sent}/${filteredSales.length}`,
                        },
                        {
                          label: "fbc válido",
                          value: filteredSales.length
                            ? Math.round((filteredSales.filter((s) => s.fbc === "ok").length / filteredSales.length) * 100)
                            : 0,
                          detail: `${filteredSales.filter((s) => s.fbc === "ok").length}/${filteredSales.length}`,
                        },
                        {
                          label: "Até 5 min",
                          value: validDelays.length
                            ? Math.round((validDelays.filter((delay) => delay <= 300).length / validDelays.length) * 100)
                            : 0,
                          detail: `${validDelays.filter((delay) => delay <= 300).length}/${validDelays.length}`,
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="font-semibold text-slate-900">{item.value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                item.value >= 90 ? "bg-emerald-500" : item.value >= 70 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-400">{item.detail} eventos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-slate-950">Últimas vendas</h2>
                      <p className="mt-1 text-sm text-slate-500">Horários lado a lado para encontrar atrasos e falhas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection("sales")}
                      className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                    >
                      Ver todas
                    </button>
                  </div>
                  <SalesTable rows={filteredSales.slice(0, 5)} />
                </div>

                <EmptyIntegrationCard />
              </div>
            )}

            {section === "sales" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Todas as vendas monitoradas</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Compare pagamento, webhook e chegada do Purchase na Meta.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      disabled
                      placeholder="Buscar pedido (em breve)"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <SalesTable rows={filteredSales} />
              </div>
            )}

            {section === "events" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Purchase enviados" value={String(sent)} detail="Confirmados pelo fluxo" icon={CheckCircle2} tone="green" />
                  <MetricCard title="Fila / atraso" value={String(delayed)} detail="Acima de 5 minutos" icon={Clock3} tone="amber" />
                  <MetricCard title="Falhas" value={String(failed)} detail="Sem confirmação de envio" icon={Server} tone={failed ? "amber" : "green"} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-bold text-slate-950">Log simplificado de eventos</h2>
                    <p className="mt-1 text-sm text-slate-500">Este será o histórico técnico de cada tentativa enviada à Meta CAPI.</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => (
                      <div key={sale.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1.4fr_1fr_auto] md:items-center">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Purchase · {sale.id}</p>
                          <p className="mt-1 text-xs text-slate-400">{offerLabel(sale.product)}</p>
                        </div>
                        <div className="font-mono text-xs text-slate-500">{sale.eventId}</div>
                        <div className="text-xs text-slate-500">
                          Compra {sale.paidAt} → Meta {sale.metaAt ?? "sem confirmação"}
                        </div>
                        <StatusBadge status={sale.metaStatus} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === "diagnostics" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-4">
                    <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-amber-950">Diagnóstico automático</h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-800">
                        O objetivo desta tela é separar problema de campanha de problema técnico. Cada alerta abaixo aponta exatamente em qual etapa o evento se perdeu ou atrasou.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-red-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-red-50 p-2 text-red-600">
                          <Tags className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-950">fbc inválido ou ausente</p>
                          <p className="text-xs text-slate-500">Pode reduzir a qualidade da correspondência.</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600">
                        {filteredSales.filter((sale) => sale.fbc !== "ok").length}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {filteredSales
                        .filter((sale) => sale.fbc !== "ok")
                        .map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                            <span className="font-medium text-slate-700">{sale.id} · {offerLabel(sale.product)}</span>
                            <FbcBadge status={sale.fbc} />
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                          <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-950">Purchase atrasado</p>
                          <p className="text-xs text-slate-500">Compra chegou à Meta após 5 minutos.</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-amber-600">{delayed}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {filteredSales
                        .filter((sale) => sale.metaStatus === "delayed")
                        .map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                            <span className="font-medium text-slate-700">{sale.id} · {offerLabel(sale.product)}</span>
                            <span className="font-bold text-amber-600">{delayLabel(sale.delaySeconds)}</span>
                          </div>
                        ))}
                      {delayed === 0 && <p className="text-sm text-slate-400">Nenhum atraso no filtro atual.</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="font-bold text-slate-950">Checklist que o sistema vai validar automaticamente</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      ["event_time", "Horário original da compra, não o horário do reenvio."],
                      ["event_id", "ID único e consistente para deduplicação."],
                      ["fbc / fbp", "Preservados sem lowercase, corte ou reconstrução errada."],
                      ["order_id", "Uma venda real vinculada a um único pedido."],
                      ["produto", "Carros e motos separados mesmo usando o mesmo Pixel."],
                      ["resposta Meta", "Salvar código e mensagem de cada tentativa da CAPI."],
                    ].map(([title, detail]) => (
                      <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <p className="font-mono text-xs font-bold text-slate-800">{title}</p>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <EmptyIntegrationCard />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
