import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Mail, Globe, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// API cost constants
const SERPAPI_COST_PER_CREDIT = 0.025; // USD
const HUNTER_COST_PER_CREDIT = 0.025; // EUR
const SERPAPI_PLAN_CREDITS = 1000;
const HUNTER_PLAN_CREDITS = 2000;
const SERPAPI_MONTHLY_COST = 25; // USD
const HUNTER_MONTHLY_COST = 34; // EUR

interface MonthlyStats {
  month: string;
  label: string;
  totalProcessed: number;
  websiteFound: number;
  emailFoundScraping: number;
  emailFoundHunter: number;
  emailFoundTotal: number;
  hunterAttempted: number;
  emailsSent: number;
  serpApiRate: number;
  scrapingRate: number;
  hunterRate: number;
  globalRate: number;
  serpApiCost: number;
  hunterCost: number;
  totalCost: number;
  costPerAttempt: number;
  costPerSuccess: number;
}

interface SubscriptionStats {
  totalUsers: number;
  freeUsers: number;
  simpleUsers: number;
  plusUsers: number;
  mrr: number;
}

export const AdminProfitability = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [currentMonth, setCurrentMonth] = useState<MonthlyStats | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies data with source tracking
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("created_at, website_url, email_source, hunter_attempted, selected_email, emails")
        .order("created_at", { ascending: true });

      if (compError) throw compError;

      // Fetch email campaigns (sent emails)
      const { data: campaigns, error: campError } = await supabase
        .from("email_campaigns")
        .select("sent_at, status")
        .eq("status", "sent");

      if (campError) throw campError;

      // Fetch subscriptions for MRR
      const { data: subs, error: subError } = await supabase
        .from("subscriptions")
        .select("plan_type, status")
        .eq("status", "active");

      if (subError) throw subError;

      // Calculate subscription stats
      const subData: SubscriptionStats = {
        totalUsers: subs?.length || 0,
        freeUsers: subs?.filter(s => s.plan_type === "free").length || 0,
        simpleUsers: subs?.filter(s => s.plan_type === "simple").length || 0,
        plusUsers: subs?.filter(s => s.plan_type === "plus").length || 0,
        mrr: (subs?.filter(s => s.plan_type === "simple").length || 0) * 14 +
             (subs?.filter(s => s.plan_type === "plus").length || 0) * 39,
      };
      setSubStats(subData);

      // Group by month
      const monthMap = new Map<string, {
        processed: number;
        websiteFound: number;
        scrapingSuccess: number;
        hunterSuccess: number;
        hunterAttempted: number;
        emailsSent: number;
      }>();

      const allCompanies = companies || [];
      
      for (const c of allCompanies) {
        const date = new Date(c.created_at || "");
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!monthMap.has(key)) {
          monthMap.set(key, { processed: 0, websiteFound: 0, scrapingSuccess: 0, hunterSuccess: 0, hunterAttempted: 0, emailsSent: 0 });
        }
        const m = monthMap.get(key)!;
        
        // Only count companies that were actually processed (have email_source or selected_email)
        const wasProcessed = c.email_source || c.selected_email;
        if (wasProcessed) {
          m.processed++;
          if (c.website_url) m.websiteFound++;
          if (c.email_source === "scraping") m.scrapingSuccess++;
          if (c.email_source === "hunter") m.hunterSuccess++;
          if (c.hunter_attempted) m.hunterAttempted++;
        } else if (c.selected_email) {
          // Legacy: before tracking, infer from data
          m.processed++;
          if (c.website_url) m.websiteFound++;
          // Can't distinguish source for legacy data
          const hasEmail = c.emails && (c.emails as any[]).length > 0;
          if (hasEmail) m.scrapingSuccess++; // Best guess for legacy
        }
      }

      // Count sent emails per month
      for (const camp of (campaigns || [])) {
        if (!camp.sent_at) continue;
        const date = new Date(camp.sent_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap.has(key)) {
          monthMap.get(key)!.emailsSent++;
        } else {
          monthMap.set(key, { processed: 0, websiteFound: 0, scrapingSuccess: 0, hunterSuccess: 0, hunterAttempted: 0, emailsSent: 1 });
        }
      }

      // Convert to sorted array
      const months = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => {
          const emailFoundTotal = data.scrapingSuccess + data.hunterSuccess;
          const serpApiRate = data.processed > 0 ? (data.websiteFound / data.processed) * 100 : 0;
          const scrapingWithSite = data.websiteFound; // scraping attempted on all with website
          const scrapingRate = scrapingWithSite > 0 ? (data.scrapingSuccess / scrapingWithSite) * 100 : 0;
          const hunterRate = data.hunterAttempted > 0 ? (data.hunterSuccess / data.hunterAttempted) * 100 : 0;
          const globalRate = data.processed > 0 ? (emailFoundTotal / data.processed) * 100 : 0;

          const serpApiCost = data.processed * SERPAPI_COST_PER_CREDIT;
          const hunterCost = data.hunterAttempted * HUNTER_COST_PER_CREDIT;
          const totalCost = serpApiCost + hunterCost;
          const costPerAttempt = data.processed > 0 ? totalCost / data.processed : 0;
          const costPerSuccess = emailFoundTotal > 0 ? totalCost / emailFoundTotal : 0;

          const [year, month] = key.split("-");
          const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

          return {
            month: key,
            label,
            totalProcessed: data.processed,
            websiteFound: data.websiteFound,
            emailFoundScraping: data.scrapingSuccess,
            emailFoundHunter: data.hunterSuccess,
            emailFoundTotal,
            hunterAttempted: data.hunterAttempted,
            emailsSent: data.emailsSent,
            serpApiRate,
            scrapingRate,
            hunterRate,
            globalRate,
            serpApiCost,
            hunterCost,
            totalCost,
            costPerAttempt,
            costPerSuccess,
          } as MonthlyStats;
        });

      setMonthlyData(months);
      
      // Current month
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setCurrentMonth(months.find(m => m.month === currentKey) || null);

    } catch (err) {
      console.error("Error fetching profitability data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Alerts
  const alerts = useMemo(() => {
    if (!currentMonth) return [];
    const a: { type: "error" | "warning"; message: string }[] = [];

    if (currentMonth.globalRate > 0 && currentMonth.globalRate < 50) {
      a.push({ type: "error", message: `Taux d'aboutissement à ${currentMonth.globalRate.toFixed(1)}% — plus d'1 envoi sur 2 n'aboutit pas.` });
    }
    if (currentMonth.totalProcessed > SERPAPI_PLAN_CREDITS * 0.8) {
      a.push({ type: "warning", message: `SerpAPI: ${currentMonth.totalProcessed} crédits utilisés sur ${SERPAPI_PLAN_CREDITS}. Risque de dépassement.` });
    }
    if (currentMonth.hunterAttempted > HUNTER_PLAN_CREDITS * 0.8) {
      a.push({ type: "warning", message: `Hunter: ${currentMonth.hunterAttempted} crédits utilisés sur ${HUNTER_PLAN_CREDITS}. Risque de dépassement.` });
    }
    if (currentMonth.serpApiRate > 0 && currentMonth.serpApiRate < 35) {
      a.push({ type: "error", message: `SerpAPI performe mal: ${currentMonth.serpApiRate.toFixed(1)}% de sites trouvés (estimé: 45%).` });
    }
    if (currentMonth.hunterRate > 0 && currentMonth.hunterRate < 20) {
      a.push({ type: "warning", message: `Hunter performe mal: ${currentMonth.hunterRate.toFixed(1)}% de succès (estimé: 32%).` });
    }

    // Margin alert
    if (subStats && subStats.mrr > 0 && currentMonth.totalCost > 0) {
      const margin = ((subStats.mrr - currentMonth.totalCost) / subStats.mrr) * 100;
      if (margin < 25) {
        a.push({ type: "error", message: `Marge brute faible: ${margin.toFixed(1)}%. Les coûts fixes vont l'éroder davantage.` });
      }
    }

    return a;
  }, [currentMonth, subStats]);

  // Projection
  const projection = useMemo(() => {
    if (!currentMonth || currentMonth.totalProcessed === 0) return null;
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const ratio = daysInMonth / dayOfMonth;

    return {
      projectedProcessed: Math.round(currentMonth.totalProcessed * ratio),
      projectedCost: currentMonth.totalCost * ratio,
      projectedSerpCredits: Math.round(currentMonth.totalProcessed * ratio),
      projectedHunterCredits: Math.round(currentMonth.hunterAttempted * ratio),
      serpOverage: Math.max(0, Math.round(currentMonth.totalProcessed * ratio) - SERPAPI_PLAN_CREDITS),
      hunterOverage: Math.max(0, Math.round(currentMonth.hunterAttempted * ratio) - HUNTER_PLAN_CREDITS),
    };
  }, [currentMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const RateIndicator = ({ real, estimated, label }: { real: number; estimated: number; label: string }) => {
    const diff = real - estimated;
    const isGood = diff >= 0;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-semibold">{real.toFixed(1)}%</span>
        <span className="text-muted-foreground">| Est. {estimated}%</span>
        <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
          {isGood ? "+" : ""}{diff.toFixed(1)}pts
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rentabilité API</h1>
          <p className="text-muted-foreground text-sm">Suivi des coûts et performances en temps réel</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rafraîchir
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
              alert.type === "error" 
                ? "bg-destructive/10 border-destructive/30 text-destructive" 
                : "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Real-time metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sends block */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" /> Envois ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonth?.totalProcessed || "—"}</div>
            <div className="text-sm text-muted-foreground">
              {currentMonth ? `${currentMonth.emailFoundTotal} emails trouvés` : "—"}
            </div>
            {currentMonth && currentMonth.totalProcessed > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Taux aboutissement</span>
                  <span className={currentMonth.globalRate >= 50 ? "text-green-600" : "text-destructive"}>
                    {currentMonth.globalRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={currentMonth.globalRate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SerpAPI block */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" /> SerpAPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMonth ? (
              <>
                <RateIndicator real={currentMonth.serpApiRate} estimated={45} label="Sites trouvés" />
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{currentMonth.totalProcessed} / {SERPAPI_PLAN_CREDITS} crédits</span>
                    <span>{((currentMonth.totalProcessed / SERPAPI_PLAN_CREDITS) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(currentMonth.totalProcessed / SERPAPI_PLAN_CREDITS) * 100} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Coût: {currentMonth.serpApiCost.toFixed(2)}$ / {SERPAPI_MONTHLY_COST}$
                </div>
              </>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>

        {/* Hunter block */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> Hunter.io
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMonth ? (
              <>
                <RateIndicator real={currentMonth.hunterRate} estimated={32} label="Emails trouvés" />
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{currentMonth.hunterAttempted} / {HUNTER_PLAN_CREDITS} crédits</span>
                    <span>{((currentMonth.hunterAttempted / HUNTER_PLAN_CREDITS) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(currentMonth.hunterAttempted / HUNTER_PLAN_CREDITS) * 100} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Coût: {currentMonth.hunterCost.toFixed(2)}€ / {HUNTER_MONTHLY_COST}€
                </div>
              </>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>

        {/* Total costs block */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Coûts totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMonth ? (
              <>
                <div className="text-2xl font-bold">{currentMonth.totalCost.toFixed(2)}€</div>
                <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Par tentative</span>
                    <span className="font-medium text-foreground">{currentMonth.costPerAttempt.toFixed(3)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Par email trouvé</span>
                    <span className="font-medium text-foreground">
                      {currentMonth.costPerSuccess > 0 ? `${currentMonth.costPerSuccess.toFixed(3)}€` : "—"}
                    </span>
                  </div>
                </div>
              </>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Profitability */}
      {subStats && currentMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rentabilité — Modèle abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">MRR</div>
                <div className="text-xl font-bold text-green-600">{subStats.mrr}€</div>
                <div className="text-xs text-muted-foreground">
                  {subStats.simpleUsers} Standard + {subStats.plusUsers} Premium
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Coûts API</div>
                <div className="text-xl font-bold text-destructive">{currentMonth.totalCost.toFixed(2)}€</div>
                <div className="text-xs text-muted-foreground">
                  + {SERPAPI_MONTHLY_COST}$ SerpAPI + {HUNTER_MONTHLY_COST}€ Hunter (abo)
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Marge brute</div>
                {(() => {
                  const fixedCosts = SERPAPI_MONTHLY_COST * 0.92 + HUNTER_MONTHLY_COST; // Convert USD
                  const margin = subStats.mrr - fixedCosts - currentMonth.totalCost;
                  const marginPct = subStats.mrr > 0 ? (margin / subStats.mrr) * 100 : 0;
                  return (
                    <>
                      <div className={`text-xl font-bold ${margin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {margin.toFixed(2)}€
                      </div>
                      <div className="text-xs text-muted-foreground">{marginPct.toFixed(1)}% du MRR</div>
                    </>
                  );
                })()}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Seuil de rentabilité</div>
                {(() => {
                  const fixedCosts = SERPAPI_MONTHLY_COST * 0.92 + HUNTER_MONTHLY_COST;
                  const avgRevPerUser = subStats.totalUsers > 0 ? subStats.mrr / (subStats.simpleUsers + subStats.plusUsers || 1) : 0;
                  const breakeven = avgRevPerUser > 0 ? Math.ceil(fixedCosts / avgRevPerUser) : 0;
                  const payingUsers = subStats.simpleUsers + subStats.plusUsers;
                  return (
                    <>
                      <div className="text-xl font-bold">{breakeven} abonnés</div>
                      <div className="text-xs text-muted-foreground">
                        Actuellement: {payingUsers} payants
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Charts */}
      {monthlyData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Success rates chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Taux de succès par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis unit="%" className="text-xs" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="serpApiRate" name="SerpAPI (sites)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="scrapingRate" name="Scraping (emails)" stroke="hsl(142, 76%, 36%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="hunterRate" name="Hunter (emails)" stroke="hsl(38, 92%, 50%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="globalRate" name="Global" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Costs chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Coûts API vs Revenus par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis unit="€" className="text-xs" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}€`} />
                  <Legend />
                  <Bar dataKey="serpApiCost" name="SerpAPI" fill="hsl(var(--primary))" stackId="costs" />
                  <Bar dataKey="hunterCost" name="Hunter" fill="hsl(38, 92%, 50%)" stackId="costs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 4: Projection */}
      {projection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Projection fin de mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Envois projetés</div>
                <div className="text-lg font-bold">{projection.projectedProcessed}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Coût API projeté</div>
                <div className="text-lg font-bold">{projection.projectedCost.toFixed(2)}€</div>
              </div>
              <div>
                <div className="text-muted-foreground">SerpAPI crédits projetés</div>
                <div className={`text-lg font-bold ${projection.serpOverage > 0 ? "text-destructive" : ""}`}>
                  {projection.projectedSerpCredits} / {SERPAPI_PLAN_CREDITS}
                </div>
                {projection.serpOverage > 0 && (
                  <div className="text-xs text-destructive">⚠ Dépassement: +{projection.serpOverage} crédits</div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground">Hunter crédits projetés</div>
                <div className={`text-lg font-bold ${projection.hunterOverage > 0 ? "text-destructive" : ""}`}>
                  {projection.projectedHunterCredits} / {HUNTER_PLAN_CREDITS}
                </div>
                {projection.hunterOverage > 0 && (
                  <div className="text-xs text-destructive">⚠ Dépassement: +{projection.hunterOverage} crédits</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Monthly summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique mensuel</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Mois</th>
                <th className="pb-2 pr-4">Traités</th>
                <th className="pb-2 pr-4">Sites</th>
                <th className="pb-2 pr-4">Scraping</th>
                <th className="pb-2 pr-4">Hunter</th>
                <th className="pb-2 pr-4">Total emails</th>
                <th className="pb-2 pr-4">Taux global</th>
                <th className="pb-2 pr-4">Coût total</th>
                <th className="pb-2 pr-4">Coût/email</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => (
                <tr key={m.month} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{m.label}</td>
                  <td className="py-2 pr-4">{m.totalProcessed}</td>
                  <td className="py-2 pr-4">{m.websiteFound} ({m.serpApiRate.toFixed(0)}%)</td>
                  <td className="py-2 pr-4">{m.emailFoundScraping}</td>
                  <td className="py-2 pr-4">{m.emailFoundHunter} / {m.hunterAttempted}</td>
                  <td className="py-2 pr-4 font-medium">{m.emailFoundTotal}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={m.globalRate >= 50 ? "default" : "destructive"} className="text-xs">
                      {m.globalRate.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">{m.totalCost.toFixed(2)}€</td>
                  <td className="py-2 pr-4">
                    {m.costPerSuccess > 0 ? `${m.costPerSuccess.toFixed(3)}€` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
