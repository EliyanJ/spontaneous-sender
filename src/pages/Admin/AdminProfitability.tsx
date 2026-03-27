import React, { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Constants ──
const SERPAPI_COST_USD = 0.025;
const HUNTER_COST_EUR = 0.025;
const SERPAPI_PLAN_CREDITS = 1000;
const HUNTER_PLAN_CREDITS = 2000;
const SERPAPI_PLAN_USD = 25;
const HUNTER_PLAN_EUR = 50;
// TODO: rendre configurable
const EUR_USD = 0.92;
const SERPAPI_COST_EUR = SERPAPI_COST_USD * EUR_USD; // 0.023€

// ── Design tokens (matching HTML reference exactly) ──
const C = {
  bg: "#0e0e12", s1: "#16161e", s2: "#1d1d28", s3: "#23232f",
  b1: "rgba(255,255,255,0.06)", b2: "rgba(255,255,255,0.11)",
  text: "#eeeef5", muted: "#5f5f78", dim: "#3a3a50",
  purple: "#8b7cf8", purpleDim: "rgba(139,124,248,0.12)",
  green: "#34d399", greenDim: "rgba(52,211,153,0.1)",
  red: "#f87171", redDim: "rgba(248,113,113,0.1)",
  amber: "#fbbf24", amberDim: "rgba(251,191,36,0.1)",
  blue: "#60a5fa", teal: "#2dd4bf", tealDim: "rgba(45,212,191,0.1)",
};

const fontHead = "'Syne', sans-serif";
const fontMono = "'DM Mono', monospace";

// ── Types ──
interface MonthData {
  key: string; label: string;
  serpAttempts: number; serpSuccesses: number;
  scrapingAttempts: number; scrapingSuccesses: number;
  hunterAttempts: number; hunterSuccesses: number;
  totalFound: number;
}

// ── Data fetching ──
async function fetchProfitabilityData() {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("updated_at, website_url, email_source, hunter_attempted");
  if (error) throw error;

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("status", "active");

  // Group by month
  const monthMap = new Map<string, Omit<MonthData, "key" | "label">>();

  for (const c of companies || []) {
    if (!c.email_source && c.email_source !== "none") continue; // not processed
    const d = new Date(c.updated_at || "");
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(k)) monthMap.set(k, { serpAttempts: 0, serpSuccesses: 0, scrapingAttempts: 0, scrapingSuccesses: 0, hunterAttempts: 0, hunterSuccesses: 0, totalFound: 0 });
    const m = monthMap.get(k)!;
    // SerpAPI: every processed company = 1 SerpAPI call
    m.serpAttempts++;
    if (c.website_url) m.serpSuccesses++;
    // Scraping: attempted on companies with a website
    if (c.website_url) m.scrapingAttempts++;
    if (c.email_source === "scraping") m.scrapingSuccesses++;
    // Hunter
    if (c.hunter_attempted) m.hunterAttempts++;
    if (c.email_source === "hunter") m.hunterSuccesses++;
    if (c.email_source === "scraping" || c.email_source === "hunter") m.totalFound++;
  }

  const months: MonthData[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, d]) => {
      const [y, mo] = key.split("-");
      const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { key, label, ...d };
    });

  // MRR
  const simpleUsers = subs?.filter(s => s.plan_type === "simple").length || 0;
  const plusUsers = subs?.filter(s => s.plan_type === "plus").length || 0;
  const mrr = simpleUsers * 14 + plusUsers * 39;

  return { months, mrr, simpleUsers, plusUsers };
}

// ── Helpers ──
function rateColor(rate: number) {
  if (rate >= 60) return C.green;
  if (rate >= 40) return C.amber;
  return C.red;
}
function marginColor(pct: number) {
  if (pct > 50) return C.green;
  if (pct > 20) return C.amber;
  return C.red;
}
function fmt(n: number, d = 2) { return n.toFixed(d); }
function fmtInt(n: number) { return n.toLocaleString("fr-FR"); }

// ── Component ──
export const AdminProfitability = () => {
  const [activeTab, setActiveTab] = useState<"profitability" | "sources" | "history" | "projection">("profitability");
  const [pricePerSend, setPricePerSend] = useState(0.35);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-profitability"],
    queryFn: fetchProfitabilityData,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const cm = data?.months.find(m => m.key === currentKey);
  const last3 = data?.months.slice(-3) || [];

  // Rates from current month
  const serpRate = cm && cm.serpAttempts > 0 ? (cm.serpSuccesses / cm.serpAttempts) * 100 : 0;
  const scrapRate = cm && cm.scrapingAttempts > 0 ? (cm.scrapingSuccesses / cm.scrapingAttempts) * 100 : 0;
  const hunterRate = cm && cm.hunterAttempts > 0 ? (cm.hunterSuccesses / cm.hunterAttempts) * 100 : 0;
  const globalRate = cm && cm.serpAttempts > 0 ? (cm.totalFound / cm.serpAttempts) * 100 : 0;
  const hunterCallRatio = cm && cm.serpAttempts > 0 ? cm.hunterAttempts / cm.serpAttempts : 0;

  // Costs
  const serpCost = cm ? cm.serpAttempts * SERPAPI_COST_EUR : 0;
  const hunterCost = cm ? cm.hunterAttempts * HUNTER_COST_EUR : 0;
  const hunterOverageCr = cm ? Math.max(0, cm.hunterAttempts - HUNTER_PLAN_CREDITS) : 0;
  const hunterOverageCost = hunterOverageCr * HUNTER_COST_EUR;
  const totalCost = serpCost + hunterCost;
  const costPerAttempt = cm && cm.serpAttempts > 0 ? totalCost / cm.serpAttempts : 0;

  // Alerts
  const alerts = useMemo(() => {
    if (!cm) return [];
    const a: { level: "red" | "amber"; msg: string }[] = [];
    if (cm.hunterAttempts > HUNTER_PLAN_CREDITS)
      a.push({ level: "red", msg: `Hunter.io dépasse son plan — ${fmtInt(cm.hunterAttempts)} tentatives sur ${fmtInt(HUNTER_PLAN_CREDITS)} incluses. Surcoût actuel : ${fmt(hunterOverageCost)}€ ce mois.` });
    if (cm.serpAttempts > SERPAPI_PLAN_CREDITS * 0.8)
      a.push({ level: "amber", msg: `SerpIA à ${fmtInt(cm.serpAttempts)} / ${fmtInt(SERPAPI_PLAN_CREDITS)} crédits — ${((cm.serpAttempts / SERPAPI_PLAN_CREDITS) * 100).toFixed(0)}% consommé.` });
    if (globalRate > 0 && globalRate < 40)
      a.push({ level: "amber", msg: `Taux d'aboutissement à ${fmt(globalRate, 1)}% — plus d'1 envoi sur 2 n'aboutit pas.` });
    if (scrapRate > 0 && scrapRate < 30)
      a.push({ level: "amber", msg: `Taux scraping faible : ${fmt(scrapRate, 1)}%. Le coût par email abouti augmente.` });
    if (hunterRate > 0 && hunterRate < 20)
      a.push({ level: "red", msg: `Hunter performe mal : ${fmt(hunterRate, 1)}% de succès. Évalue si l'abonnement est justifié.` });
    return a;
  }, [cm, globalRate, scrapRate, hunterRate, hunterOverageCost]);

  // Projection
  const projection = useMemo(() => {
    if (!cm || cm.serpAttempts === 0) return null;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const dailyRate = cm.serpAttempts / dayOfMonth;
    const projected = Math.round(cm.serpAttempts + dailyRate * daysRemaining);
    const projHunter = Math.round(cm.hunterAttempts + (cm.hunterAttempts / dayOfMonth) * daysRemaining);
    return {
      projected, projHunter, dailyRate: Math.round(dailyRate), daysRemaining,
      serpOverage: Math.max(0, projected - SERPAPI_PLAN_CREDITS),
      hunterOverage: Math.max(0, projHunter - HUNTER_PLAN_CREDITS),
      projCost: projected * SERPAPI_COST_EUR + projHunter * HUNTER_COST_EUR,
    };
  }, [cm, now]);

  // Rentability table rows
  const rentRows = [10, 25, 50, 100, 200, 500, 1000];

  // Wrapper style
  const pageStyle: React.CSSProperties = {
    background: C.bg, color: C.text, fontFamily: fontMono, fontSize: 13,
    minHeight: "100vh", position: "relative",
  };

  const gridBg: React.CSSProperties = {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `linear-gradient(${C.b1} 1px, transparent 1px), linear-gradient(90deg, ${C.b1} 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
  };

  if (isLoading) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={gridBg} />
        <div style={{ position: "relative", zIndex: 1, color: C.muted }}>Chargement...</div>
      </div>
    );
  }

  const tabs = [
    { id: "profitability" as const, label: "Rentabilité" },
    { id: "sources" as const, label: "Sources emails" },
    { id: "history" as const, label: "Historique" },
    { id: "projection" as const, label: "Projection" },
  ];

  const currentMonthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div style={pageStyle}>
      <div style={gridBg} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside style={{
          width: 240, background: C.s1, borderRight: `1px solid ${C.b1}`,
          padding: "24px 18px", display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ fontFamily: fontHead, fontSize: 10, letterSpacing: "0.15em", color: C.purple, textTransform: "uppercase", marginBottom: 4 }}>
            Chronos Job
          </div>
          <div style={{ fontFamily: fontHead, fontSize: 17, fontWeight: 800, lineHeight: 1.15, marginBottom: 6 }}>
            Dashboard<br />Admin
          </div>
          <div style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 9, letterSpacing: "0.1em",
            textTransform: "uppercase", background: C.purpleDim, color: C.purple,
            border: "1px solid rgba(139,124,248,0.2)", marginBottom: 20, width: "fit-content",
          }}>Admin only</div>

          <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, margin: "16px 0 6px", paddingLeft: 11 }}>
            Navigation
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 11px",
                borderRadius: 6, cursor: "pointer", border: activeTab === t.id ? "1px solid rgba(139,124,248,0.2)" : "1px solid transparent",
                background: activeTab === t.id ? C.purpleDim : "transparent",
                color: activeTab === t.id ? C.purple : C.muted,
                fontFamily: fontMono, fontSize: 11, textAlign: "left", width: "100%",
                transition: "all 0.15s",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeTab === t.id ? C.purple : C.dim, flexShrink: 0 }} />
                {t.label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.b1}` }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Période analysée</div>
            <div style={{
              width: "100%", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 6,
              padding: "7px 10px", color: C.text, fontFamily: fontMono, fontSize: 11,
            }}>Ce mois ({currentMonthLabel})</div>
          </div>

          {/* Refresh */}
          <button onClick={() => refetch()} style={{
            marginTop: 12, display: "flex", alignItems: "center", gap: 6, padding: "7px 11px",
            borderRadius: 6, background: C.s2, border: `1px solid ${C.b2}`, color: C.muted,
            fontFamily: fontMono, fontSize: 11, cursor: "pointer", width: "100%",
          }}>
            <RefreshCw size={12} /> Rafraîchir
          </button>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "28px", overflowY: "auto" }}>

          {/* ═══ PAGE 1: RENTABILITÉ ═══ */}
          {activeTab === "profitability" && (
            <div>
              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{
                      borderRadius: 6, padding: "10px 14px", fontSize: 12, lineHeight: 1.6,
                      borderLeft: `3px solid ${a.level === "red" ? C.red : C.amber}`,
                      background: a.level === "red" ? C.redDim : C.amberDim,
                      color: a.level === "red" ? C.red : C.amber,
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}>
                      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }}>{a.level === "red" ? "✕" : "!"}</span>
                      <div dangerouslySetInnerHTML={{ __html: a.msg }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Sources section label */}
              <SectionLabel text={`Sources d'emails — ${currentMonthLabel}`} />

              {/* Source grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }} className="profitability-source-grid">
                {/* SerpIA */}
                <SourceCard
                  name="SerpIA" nameColor={C.teal}
                  costLabel={`${SERPAPI_PLAN_USD}$ · ${fmtInt(SERPAPI_PLAN_CREDITS)} cr · ${fmt(SERPAPI_COST_EUR, 3)}€/cr`}
                  stats={[
                    { label: "Tentatives", value: fmtInt(cm?.serpAttempts || 0), color: C.teal },
                    { label: "Sites trouvés", value: fmtInt(cm?.serpSuccesses || 0), color: C.teal },
                    { label: "Taux succès", value: cm ? `${fmt(serpRate, 1)}%` : "—", color: rateColor(serpRate) },
                    { label: "Coût ce mois", value: `${fmt(serpCost)}€`, color: C.muted },
                  ]}
                  progressLabel="Crédits utilisés"
                  progressValue={cm?.serpAttempts || 0}
                  progressMax={SERPAPI_PLAN_CREDITS}
                  progressColor={
                    (cm?.serpAttempts || 0) > SERPAPI_PLAN_CREDITS * 0.9 ? C.red
                      : (cm?.serpAttempts || 0) > SERPAPI_PLAN_CREDITS * 0.7 ? C.amber : C.teal
                  }
                />
                {/* Scraping */}
                <SourceCard
                  name="Scraping" nameColor={C.green}
                  costLabel="Gratuit"
                  stats={[
                    { label: "Tentatives", value: fmtInt(cm?.scrapingAttempts || 0), color: C.green },
                    { label: "Emails trouvés", value: fmtInt(cm?.scrapingSuccesses || 0), color: C.green },
                    { label: "Taux succès", value: cm ? `${fmt(scrapRate, 1)}%` : "—", color: rateColor(scrapRate) },
                    { label: "Coût ce mois", value: "0,00€", color: C.green },
                  ]}
                  progressLabel="Taux vs objectif 60%"
                  progressValue={scrapRate}
                  progressMax={100}
                  progressColor={rateColor(scrapRate)}
                />
                {/* Hunter */}
                <SourceCard
                  name="Hunter.io" nameColor={C.purple}
                  costLabel={`${HUNTER_PLAN_EUR}€ · ${fmtInt(HUNTER_PLAN_CREDITS)} cr · ${fmt(HUNTER_COST_EUR, 3)}€/cr`}
                  stats={[
                    { label: "Tentatives", value: fmtInt(cm?.hunterAttempts || 0), color: C.purple },
                    { label: "Emails trouvés", value: fmtInt(cm?.hunterSuccesses || 0), color: C.purple },
                    { label: "Taux succès", value: cm ? `${fmt(hunterRate, 1)}%` : "—", color: rateColor(hunterRate) },
                    { label: "Coût ce mois", value: `${fmt(hunterCost + hunterOverageCost)}€`, color: C.muted },
                  ]}
                  progressLabel="Crédits utilisés"
                  progressValue={cm?.hunterAttempts || 0}
                  progressMax={HUNTER_PLAN_CREDITS}
                  progressColor={
                    (cm?.hunterAttempts || 0) > HUNTER_PLAN_CREDITS ? C.red
                      : (cm?.hunterAttempts || 0) > HUNTER_PLAN_CREDITS * 0.7 ? C.amber : C.purple
                  }
                />
              </div>

              {/* Global metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }} className="profitability-global-grid">
                <MetricCard label="Tentatives totales" value={fmtInt(cm?.serpAttempts || 0)} sub="entreprises traitées" valueColor={C.blue} />
                <MetricCard label="Emails trouvés" value={fmtInt(cm?.totalFound || 0)} sub={`${cm?.scrapingSuccesses || 0} scraping + ${cm?.hunterSuccesses || 0} Hunter`} valueColor={C.green} />
                <MetricCard label="Taux aboutissement" value={cm ? `${fmt(globalRate, 1)}%` : "—"} sub={cm ? `${cm.totalFound} / ${cm.serpAttempts}` : ""} valueColor={rateColor(globalRate)} />
                <MetricCard label="Coût API total" value={`${fmt(totalCost)}€`} sub="SerpIA + Hunter ce mois" valueColor={C.red} />
              </div>

              {/* Separator */}
              <div style={{ height: 1, background: C.b1, margin: "20px 0" }} />

              {/* Rentability table */}
              <SectionLabel text="Rentabilité par volume — taux réels appliqués" />
              <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                {/* Header */}
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
                      Simulation avec les vrais taux (SerpIA {fmt(serpRate, 1)}% · Scraping {fmt(scrapRate, 1)}% · Hunter {fmt(hunterRate, 1)}%)
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      Taux d'aboutissement réel : {fmt(globalRate, 1)}% — coût API réel : {fmt(costPerAttempt, 3)}€ / tentative
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>Prix / envoi</span>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={pricePerSend}
                      onChange={e => setPricePerSend(parseFloat(e.target.value) || 0)}
                      style={{
                        background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 6,
                        padding: "5px 10px", color: C.purple, fontFamily: fontHead, fontSize: 14,
                        fontWeight: 800, width: 80, textAlign: "center", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 11, color: C.muted }}>€</span>
                  </div>
                </div>
                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Envois demandés", "Emails aboutis", "Coût SerpIA", "Coût Hunter", "Coût total", "Revenus", "Marge", "Marge %"].map((h, i) => (
                          <td key={h} style={{
                            fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
                            padding: "10px 16px 8px", borderBottom: `1px solid ${C.b2}`,
                            textAlign: i === 0 ? "left" : "right",
                          }}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rentRows.map(n => {
                        const aboutRate = globalRate / 100 || 0;
                        const aboutis = Math.round(n * aboutRate);
                        const cSerp = n * SERPAPI_COST_EUR;
                        const cHunter = n * hunterCallRatio * HUNTER_COST_EUR;
                        const cTotal = cSerp + cHunter;
                        const rev = n * pricePerSend;
                        const margin = rev - cTotal;
                        const pct = rev > 0 ? (margin / rev) * 100 : 0;
                        const isHighlight = n === 200;
                        return (
                          <tr key={n} style={{
                            borderBottom: `1px solid ${C.b1}`,
                            background: isHighlight ? "rgba(139,124,248,0.07)" : undefined,
                          }}>
                            <td style={{ padding: "10px 16px", fontSize: 12, color: C.muted }}>{fmtInt(n)}</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: C.text }}>{aboutis}</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: C.teal }}>{fmt(cSerp)}€</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: C.purple }}>{fmt(cHunter)}€</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: C.red }}>{fmt(cTotal)}€</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: C.blue }}>{fmt(rev)}€</td>
                            <td style={{ padding: "10px 16px", fontSize: 14, fontFamily: fontHead, fontWeight: 800, textAlign: "right", color: marginColor(pct) }}>
                              {margin >= 0 ? "" : "-"}{fmt(Math.abs(margin))}€
                            </td>
                            <td style={{ padding: "10px 16px", textAlign: "right" }}>
                              <span style={{
                                display: "inline-block", padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                                background: pct > 50 ? C.greenDim : pct > 20 ? C.amberDim : C.redDim,
                                color: marginColor(pct),
                              }}>{fmt(pct, 0)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAGE 2: SOURCES ═══ */}
          {activeTab === "sources" && (
            <div>
              <SectionLabel text="Détail sources par mois" />
              <ChartCard title="Emails trouvés par source" legend={[
                { label: "Scraping", color: C.teal },
                { label: "Hunter", color: C.purple },
                { label: "Échec", color: C.red },
              ]}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={last3.map(m => ({
                    name: m.label,
                    scraping: m.scrapingSuccesses,
                    hunter: m.hunterSuccesses,
                    fail: m.serpAttempts - m.totalFound,
                  }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: C.s1, border: `1px solid ${C.b1}`, color: C.text, fontFamily: fontMono, fontSize: 11 }} />
                    <Bar dataKey="scraping" name="Scraping" fill="rgba(45,212,191,0.6)" radius={[3, 3, 0, 0]} stackId="a" />
                    <Bar dataKey="hunter" name="Hunter" fill="rgba(139,124,248,0.6)" radius={[3, 3, 0, 0]} stackId="a" />
                    <Bar dataKey="fail" name="Échec" fill="rgba(248,113,113,0.3)" radius={[3, 3, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Taux de succès par service" legend={[
                { label: "SerpIA (site)", color: C.teal },
                { label: "Scraping (email)", color: C.green },
                { label: "Hunter", color: C.purple },
              ]}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={last3.map(m => ({
                    name: m.label,
                    serp: m.serpAttempts > 0 ? (m.serpSuccesses / m.serpAttempts) * 100 : 0,
                    scraping: m.scrapingAttempts > 0 ? (m.scrapingSuccesses / m.scrapingAttempts) * 100 : 0,
                    hunter: m.hunterAttempts > 0 ? (m.hunterSuccesses / m.hunterAttempts) * 100 : 0,
                  }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background: C.s1, border: `1px solid ${C.b1}`, color: C.text, fontFamily: fontMono, fontSize: 11 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Line type="monotone" dataKey="serp" name="SerpIA" stroke={C.teal} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="scraping" name="Scraping" stroke={C.green} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="hunter" name="Hunter" stroke={C.purple} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* ═══ PAGE 3: HISTORIQUE ═══ */}
          {activeTab === "history" && (
            <div>
              <SectionLabel text="Coûts API vs revenus" />
              <ChartCard title="Coût API total vs revenus par mois" legend={[
                { label: "Revenus", color: C.blue },
                { label: "Coût API", color: C.red },
                { label: "Marge", color: C.green },
              ]}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={last3.map(m => {
                    const cost = m.serpAttempts * SERPAPI_COST_EUR + m.hunterAttempts * HUNTER_COST_EUR;
                    return { name: m.label, revenus: data?.mrr || 0, cout: cost, marge: (data?.mrr || 0) - cost };
                  })}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} unit="€" />
                    <Tooltip contentStyle={{ background: C.s1, border: `1px solid ${C.b1}`, color: C.text, fontFamily: fontMono, fontSize: 11 }} formatter={(v: number) => `${v.toFixed(2)}€`} />
                    <Bar dataKey="revenus" name="Revenus" fill="rgba(96,165,250,0.5)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cout" name="Coût API" fill="rgba(248,113,113,0.5)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="marge" name="Marge" fill="rgba(52,211,153,0.5)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <SectionLabel text="Récapitulatif mensuel" />
              <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Mois", "Tentatives", "Emails trouvés", "Taux", "Coût API", "Revenus", "Marge"].map((h, i) => (
                          <td key={h} style={{
                            fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
                            padding: "10px 16px 8px", borderBottom: `1px solid ${C.b2}`,
                            textAlign: i === 0 ? "left" : "right",
                          }}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {last3.map((m) => {
                        const cost = m.serpAttempts * SERPAPI_COST_EUR + m.hunterAttempts * HUNTER_COST_EUR;
                        const rate = m.serpAttempts > 0 ? (m.totalFound / m.serpAttempts) * 100 : 0;
                        const isCurrent = m.key === currentKey;
                        return (
                          <tr key={m.key} style={{
                            borderBottom: `1px solid ${C.b1}`,
                            background: isCurrent ? "rgba(139,124,248,0.07)" : undefined,
                          }}>
                            <td style={{ padding: "10px 16px", fontSize: 12, color: C.muted }}>
                              {m.label} {isCurrent && <span style={{ color: C.purple, fontSize: 10 }}>← actuel</span>}
                            </td>
                            <td style={{ padding: "10px 16px", textAlign: "right", color: C.text }}>{fmtInt(m.serpAttempts)}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", color: C.text }}>{fmtInt(m.totalFound)}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right" }}>
                              <span style={{
                                padding: "2px 7px", borderRadius: 20, fontSize: 10,
                                background: rate >= 60 ? C.greenDim : rate >= 40 ? C.amberDim : C.redDim,
                                color: rateColor(rate),
                              }}>{fmt(rate, 1)}%</span>
                            </td>
                            <td style={{ padding: "10px 16px", textAlign: "right", color: C.red }}>{fmt(cost)}€</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", color: C.blue }}>{isCurrent ? "—" : `${data?.mrr || 0}€`}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", color: isCurrent ? C.muted : C.green }}>
                              {isCurrent ? "—" : `${fmt((data?.mrr || 0) - cost)}€`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAGE 4: PROJECTION ═══ */}
          {activeTab === "projection" && projection && (
            <div>
              <SectionLabel text="Projection fin de mois — basée sur le rythme actuel" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }} className="profitability-proj-grid">
                <ProjCard label="Tentatives projetées" value={fmtInt(projection.projected)}
                  sub={`Rythme : ~${projection.dailyRate}/jour · ${projection.daysRemaining} jours restants`}
                  variant="ok" />
                <ProjCard label="Coût API projeté" value={`${fmt(projection.projCost)}€`}
                  sub={`+${fmt(projection.projCost - totalCost)}€ vs aujourd'hui`}
                  variant="warn" />
                <ProjCard label="Dépassement SerpIA" value={projection.serpOverage > 0 ? `+${fmtInt(projection.serpOverage)} cr` : "Aucun"}
                  sub={projection.serpOverage > 0 ? `Surcoût estimé : ${fmt(projection.serpOverage * SERPAPI_COST_EUR)}€` : "Dans les limites du plan"}
                  variant={projection.serpOverage > 0 ? "danger" : "ok"} />
                <ProjCard label="Dépassement Hunter" value={projection.hunterOverage > 0 ? `+${fmtInt(projection.hunterOverage)} cr` : "Aucun"}
                  sub={projection.hunterOverage > 0 ? `Surcoût estimé : ${fmt(projection.hunterOverage * HUNTER_COST_EUR)}€` : "Dans les limites du plan"}
                  variant={projection.hunterOverage > 0 ? "danger" : "ok"} />
              </div>

              {/* Recommendation */}
              <div style={{
                background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 10,
                padding: "14px 16px", fontSize: 12, color: C.muted, lineHeight: 1.7,
              }}>
                <strong style={{ color: C.text }}>Recommandation :</strong>{" "}
                {projection.hunterOverage > 0
                  ? `Au rythme actuel, Hunter dépassera son plan de ${fmtInt(projection.hunterOverage)} crédits. Surcoût estimé : ${fmt(projection.hunterOverage * HUNTER_COST_EUR)}€. Envisage un plan supérieur si le volume continue.`
                  : projection.serpOverage > 0
                    ? `SerpIA va dépasser son plan de ${fmtInt(projection.serpOverage)} crédits. Surcoût estimé : ${fmt(projection.serpOverage * SERPAPI_COST_EUR)}€.`
                    : "À ce rythme, tu restes dans les limites de tes deux plans. Aucun surcoût prévu ce mois."
                }
              </div>
            </div>
          )}

          {activeTab === "projection" && !projection && (
            <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Aucune donnée ce mois pour projeter.</div>
          )}
        </main>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .profitability-source-grid { grid-template-columns: 1fr !important; }
          .profitability-global-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .profitability-proj-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

// ── Sub-components ──

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim,
      marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
    }}>
      {text}
      <span style={{ flex: 1, height: 1, background: C.b1 }} />
    </div>
  );
}

function MetricCard({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor: string }) {
  return (
    <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 800, lineHeight: 1, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function SourceCard({ name, nameColor, costLabel, stats, progressLabel, progressValue, progressMax, progressColor }: {
  name: string; nameColor: string; costLabel: string;
  stats: { label: string; value: string; color: string }[];
  progressLabel: string; progressValue: number; progressMax: number; progressColor: string;
}) {
  const pct = progressMax > 0 ? Math.min((progressValue / progressMax) * 100, 100) : 0;
  const progressText = progressMax === 100 ? `${progressValue.toFixed(1)}%` : `${fmtInt(progressValue)} / ${fmtInt(progressMax)}`;
  return (
    <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: nameColor }}>{name}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{costLabel}</span>
      </div>
      {stats.map((s, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 0", borderBottom: i < stats.length - 1 ? `1px solid ${C.b1}` : "none",
        }}>
          <span style={{ fontSize: 11, color: C.muted }}>{s.label}</span>
          <span style={{ fontFamily: fontHead, fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</span>
        </div>
      ))}
      <div style={{ margin: "10px 0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 5 }}>
          <span>{progressLabel}</span><span>{progressText}</span>
        </div>
        <div style={{ height: 4, background: C.b2, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: progressColor, transition: "width 0.4s ease" }} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, legend, children }: { title: string; legend: { label: string; color: string }[]; children: React.ReactNode }) {
  return (
    <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{title}</span>
        <div style={{ display: "flex", gap: 14, fontSize: 10, color: C.muted }}>
          {legend.map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function ProjCard({ label, value, sub, variant }: { label: string; value: string; sub: string; variant: "ok" | "warn" | "danger" }) {
  const valColor = variant === "ok" ? C.green : variant === "warn" ? C.amber : C.red;
  return (
    <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: fontHead, fontSize: 20, fontWeight: 800, marginBottom: 4, color: valColor }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim }}>{sub}</div>
    </div>
  );
}

function fmtInt(n: number) { return n.toLocaleString("fr-FR"); }
