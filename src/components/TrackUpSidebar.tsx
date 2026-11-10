import { useState } from "react";
import { Activity, BarChart3, ChevronLeft, ChevronRight, Eye, Gauge, Menu, ShoppingCart, X, ShieldCheck } from "lucide-react";

export type TrackUpView = "summary" | "transactions" | "traffic" | "ads" | "analysis";

const items = [
  { id: "summary", label: "Painel", subtitle: "Indicadores e funil", icon: Gauge },
  { id: "ads", label: "Campanhas", subtitle: "Meta Ads", icon: Activity },
  { id: "analysis", label: "Análise de anúncios", subtitle: "Comparação por criativo", icon: BarChart3 },
  { id: "transactions", label: "Vendas", subtitle: "Pedidos e webhooks", icon: ShoppingCart },
  { id: "traffic", label: "Visitas", subtitle: "Qualidade do tráfego", icon: Eye },
] as const;

export function TrackUpSidebar({ active, onChange }: { active: TrackUpView; onChange: (view: TrackUpView) => void }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const select = (view: TrackUpView) => { onChange(view); setOpen(false); };
  return (
    <>
      <div className="trackup-mobile-nav">
        <button type="button" className="trackup-menu-trigger" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu size={20} /> <span>Menu</span>
        </button>
        <span className="trackup-mobile-page">{items.find(item => item.id === active)?.label}</span>
      </div>
      {open && <button type="button" className="trackup-sidebar-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`trackup-sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
        <div className="trackup-sidebar-brand">
          <span className="trackup-sidebar-logo"><BarChart3 size={21} /></span>
          {!collapsed && <span className="trackup-sidebar-wordmark">track<span>up</span><small>ANALYTICS</small></span>}
          <button type="button" className="trackup-sidebar-close" aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        {!collapsed && <p className="trackup-menu-caption">WORKSPACE</p>}
        <nav className="trackup-sidebar-links" aria-label="Menu principal">
          {items.map(item => <button key={item.id} type="button" title={item.label} aria-current={active === item.id ? "page" : undefined} className={`trackup-sidebar-link ${active === item.id ? "is-active" : ""}`} onClick={() => select(item.id)}>
            <item.icon size={19} />
            {!collapsed && <span><strong>{item.label}</strong><small>{item.subtitle}</small></span>}
          </button>)}
        </nav>
        <div className="trackup-sidebar-footer">
          <div className="trackup-sidebar-security" title="Integrações existentes preservadas"><ShieldCheck size={18} />{!collapsed && <span>Suas conexões existentes</span>}</div>
          <button className="trackup-collapse" type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight size={17}/> : <><ChevronLeft size={17}/> <span>Recolher</span></>}</button>
        </div>
      </aside>
    </>
  );
}
