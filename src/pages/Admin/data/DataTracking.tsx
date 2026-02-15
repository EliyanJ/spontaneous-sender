import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { subDays } from "date-fns";

interface Props { period: string; }

const COLORS = [
  "hsl(150, 60%, 45%)", "hsl(0, 70%, 55%)", "hsl(40, 80%, 55%)", 
  "hsl(210, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(var(--muted-foreground))"
];

const getPeriodDays = (period: string) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 365;
};

export const DataTracking = ({ period }: Props) => {
  const [trackingRate, setTrackingRate] = useState(0);
  const [responseRate, setResponseRate] = useState(0);
  const [responseCategories, setResponseCategories] = useState<{ name: string; value: number }[]>([]);
  const [trackingComparison, setTrackingComparison] = useState<{ name: string; value: number }[]>([]);
  const [totalEmails, setTotalEmails] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = getPeriodDays(period);
      const since = subDays(new Date(), days).toISOString();

      // Get companies with pipeline tracking
      const { data: companies } = await supabase
        .from("companies")
        .select("user_id, pipeline_stage")
        .gte("created_at", since);

      // Users who use pipeline tracking (changed from default "nouveau")
      const usersWithTracking = new Set<string>();
      const allUsers = new Set<string>();
      (companies || []).forEach((c: { user_id: string; pipeline_stage: string | null }) => {
        allUsers.add(c.user_id);
        if (c.pipeline_stage && c.pipeline_stage !== "nouveau") {
          usersWithTracking.add(c.user_id);
        }
      });

      const trackPct = allUsers.size > 0 ? Math.round((usersWithTracking.size / allUsers.size) * 100) : 0;
      setTrackingRate(trackPct);
      setTrackingComparison([
        { name: "Utilisent le tracking", value: usersWithTracking.size },
        { name: "N'utilisent pas", value: allUsers.size - usersWithTracking.size },
      ]);

      // Response data
      const { count: emailCount } = await supabase
        .from("email_campaigns")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);

      const { data: responses } = await supabase
        .from("email_campaigns")
        .select("response_category")
        .gte("created_at", since)
        .not("response_category", "is", null);

      setTotalEmails(emailCount || 0);
      setTotalResponses((responses || []).length);
      setResponseRate(emailCount ? Math.round(((responses || []).length / emailCount) * 100) : 0);

      // Category breakdown
      const catMap: Record<string, number> = {};
      (responses || []).forEach((r: { response_category: string | null }) => {
        const cat = r.response_category || "Non classé";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      setResponseCategories(
        Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))
      );

      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Taux de réponse</p>
            <p className="text-3xl font-bold text-foreground">{responseRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{totalResponses} réponses / {totalEmails} emails</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Utilisent le tracking</p>
            <p className="text-3xl font-bold text-foreground">{trackingRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{trackingComparison[0]?.value || 0} utilisateurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Catégories de réponses</CardTitle></CardHeader>
          <CardContent>
            {responseCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune réponse détectée</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={responseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {responseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Tracking pipeline</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trackingComparison}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Utilisateurs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
