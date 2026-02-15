import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Mail, Search, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { period: string; }

const getPeriodDays = (period: string) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 365;
};

export const DataOverview = ({ period }: Props) => {
  const [stats, setStats] = useState({ users: 0, companies: 0, emails: 0, searches: 0 });
  const [signupChart, setSignupChart] = useState<{ date: string; count: number }[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = getPeriodDays(period);
      const since = subDays(new Date(), days).toISOString();

      const [
        { count: usersCount },
        { count: companiesCount },
        { count: emailsCount },
        { count: searchesCount },
        { data: profiles },
        { data: activityData },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("email_campaigns").select("*", { count: "exact", head: true }),
        supabase.from("job_queue").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("created_at").gte("created_at", since).order("created_at"),
        supabase.from("user_activity_logs").select("user_id").gte("created_at", since),
      ]);

      setStats({
        users: usersCount || 0,
        companies: companiesCount || 0,
        emails: emailsCount || 0,
        searches: searchesCount || 0,
      });

      // Unique active users
      const uniqueUsers = new Set((activityData || []).map((a: { user_id: string }) => a.user_id));
      setActiveUsers(uniqueUsers.size);

      // Build signup chart
      const chartMap: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd");
        chartMap[d] = 0;
      }
      (profiles || []).forEach((p: { created_at: string }) => {
        const d = format(new Date(p.created_at), "yyyy-MM-dd");
        if (chartMap[d] !== undefined) chartMap[d]++;
      });
      setSignupChart(Object.entries(chartMap).map(([date, count]) => ({ date, count })));

      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const kpis = [
    { label: "Utilisateurs", value: stats.users, icon: Users, color: "text-blue-400" },
    { label: "Entreprises", value: stats.companies, icon: Building2, color: "text-green-400" },
    { label: "Emails envoyés", value: stats.emails, icon: Mail, color: "text-purple-400" },
    { label: "Recherches", value: stats.searches, icon: Search, color: "text-yellow-400" },
  ];

  const activityRate = stats.users > 0 ? Math.round((activeUsers / stats.users) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-card/50 border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent/50">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups chart */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Inscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={signupChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(d) => format(new Date(d), "dd/MM")}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip 
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelFormatter={(d) => format(new Date(d), "dd MMMM yyyy", { locale: fr })}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Inscriptions" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity rate */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Taux d'activité</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[250px]">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--accent))" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${activityRate * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{activityRate}%</span>
                <span className="text-xs text-muted-foreground">actifs</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {activeUsers} utilisateurs actifs sur {stats.users} total
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
