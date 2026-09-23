import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
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
};

type DashboardResponse = {
  ok: boolean;
  generated_at: string;
  meta_capi_enabled: boolean;
  rows: Transaction[];
};

function formatMoney(value: number | null, currency = "BRL") {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Porto_Velho",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("approved");

  async function fetchDashboard(key: string, quiet = false) {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch(DASHBOARD_ENDPOINT, {
        headers: {
          "x-dashboard-key": key,
        },
        cache: "no-store",
      });

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
    }, 30000);
    return () => window.clearInterval(timer);
  }, [dashboardKey]);

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

  const approved = rows.filter((row) => row.status === "approved");
  const pending = rows.filter((row) => row.status === "pending");
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

  const filteredRows = rows.filter((row) =>
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
                Vega/AppMax → Supabase · modo observação
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
                Modo observação ativo
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Este painel está recebendo e lendo os webhooks reais do
                Vega/AppMax. O TrackUp não está enviando Purchase para a Meta,
                então não cria venda duplicada nem altera sua campanha atual.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            Falha ao atualizar os dados: {error}
          </div>
        )}

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
            detail="Continua desligada no TrackUp enquanto investigamos o atraso."
            status="off"
            icon={Zap}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Vendas aprovadas"
            value={String(approved.length)}
            detail="Nas últimas transações armazenadas"
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
                  Total de registros
                </span>
                <span className="font-bold text-slate-900">{rows.length}</span>
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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          <Eye className="h-3.5 w-3.5" />
                          não enviado
                        </span>
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
                      {rows.filter((row) => row.fbc_status === status).length}
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
              <p>• Meta CAPI permanece desligada nesta etapa.</p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-1 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>TrackUp · diagnóstico de rastreamento</span>
          <span>
            Atualização automática a cada 30s
            {generatedAt ? ` · servidor: ${formatDate(generatedAt)}` : ""}
          </span>
        </footer>
      </main>
    </div>
  );
}
