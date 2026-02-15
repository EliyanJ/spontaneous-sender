import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { period: string; }

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted-foreground))",
  simple: "hsl(210, 70%, 55%)",
  plus: "hsl(var(--primary))",
};

const getPeriodDays = (period: string) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 365;
};

export const DataAbonnements = ({ period }: Props) => {
  const [planData, setPlanData] = useState<{ name: string; value: number }[]>([]);
  const [conversionChart, setConversionChart] = useState<{ date: string; free: number; paid: number }[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = getPeriodDays(period);
      const since = subDays(new Date(), days).toISOString();

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("plan_type, status, created_at, updated_at");

      const planMap: Record<string, number> = { free: 0, simple: 0, plus: 0 };
      let paid = 0;
      (subs || []).forEach((s: { plan_type: string; status: string }) => {
        planMap[s.plan_type] = (planMap[s.plan_type] || 0) + 1;
        if (s.plan_type !== "free" && s.status === "active") paid++;
      });

      setTotalPaid(paid);
      setPlanData(Object.entries(planMap).map(([name, value]) => ({
        name: name === "free" ? "Gratuit" : name === "simple" ? "Standard" : "Premium",
        value,
      })));

      // Conversion over time
      const chartMap: Record<string, { free: number; paid: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd");
        chartMap[d] = { free: 0, paid: 0 };
      }
      (subs || []).forEach((s: { plan_type: string; created_at: string }) => {
        const d = format(new Date(s.created_at), "yyyy-MM-dd");
        if (chartMap[d]) {
          if (s.plan_type === "free") chartMap[d].free++;
          else chartMap[d].paid++;
        }
      });
      setConversionChart(Object.entries(chartMap).map(([date, v]) => ({ date, ...v })));

      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Abonnés payants actifs</p>
            <p className="text-3xl font-bold text-foreground">{totalPaid}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Taux de conversion</p>
            <p className="text-3xl font-bold text-foreground">
              {planData.reduce((a, b) => a + b.value, 0) > 0
                ? Math.round((totalPaid / planData.reduce((a, b) => a + b.value, 0)) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Répartition des plans</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {planData.map((entry, i) => (
                    <Cell key={i} fill={Object.values(PLAN_COLORS)[i] || "hsl(var(--accent))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion timeline */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Évolution des inscriptions</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={conversionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => format(new Date(d), "dd/MM")} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} labelFormatter={(d) => format(new Date(d), "dd MMM", { locale: fr })} />
                <Area type="monotone" dataKey="paid" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Payants" />
                <Area type="monotone" dataKey="free" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.1)" name="Gratuits" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
