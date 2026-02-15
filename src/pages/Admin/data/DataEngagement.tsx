import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { subDays } from "date-fns";

interface Props { period: string; }

const getPeriodDays = (period: string) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 365;
};

export const DataEngagement = ({ period }: Props) => {
  const [avgSessionsPerUser, setAvgSessionsPerUser] = useState(0);
  const [avgTimePerSession, setAvgTimePerSession] = useState(0);
  const [avgCompaniesPerUser, setAvgCompaniesPerUser] = useState(0);
  const [jobOffersUsage, setJobOffersUsage] = useState(0);
  const [sessionDistribution, setSessionDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = getPeriodDays(period);
      const since = subDays(new Date(), days).toISOString();

      // Get activity logs
      const { data: activities } = await supabase
        .from("user_activity_logs")
        .select("user_id, action_type, duration_ms, session_id")
        .gte("created_at", since);

      const userSessions: Record<string, Set<string>> = {};
      let totalDuration = 0;
      let sessionCount = 0;
      let jobOfferUsers = new Set<string>();

      (activities || []).forEach((a: { user_id: string; action_type: string; duration_ms: number | null; session_id: string }) => {
        if (!userSessions[a.user_id]) userSessions[a.user_id] = new Set();
        userSessions[a.user_id].add(a.session_id);

        if (a.duration_ms) {
          totalDuration += a.duration_ms;
          sessionCount++;
        }

        if (a.action_type === "tab_change" && a.action_type) {
          // Check if they visited job offers tab
          jobOfferUsers.add(a.user_id);
        }
      });

      const totalUsers = Object.keys(userSessions).length;
      const totalSessions = Object.values(userSessions).reduce((sum, s) => sum + s.size, 0);

      setAvgSessionsPerUser(totalUsers > 0 ? Math.round((totalSessions / totalUsers) * 10) / 10 : 0);
      setAvgTimePerSession(sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000 / 60) : 0);

      // Session distribution
      const distMap: Record<string, number> = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "20+": 0 };
      Object.values(userSessions).forEach((sessions) => {
        const count = sessions.size;
        if (count === 1) distMap["1"]++;
        else if (count <= 5) distMap["2-5"]++;
        else if (count <= 10) distMap["6-10"]++;
        else if (count <= 20) distMap["11-20"]++;
        else distMap["20+"]++;
      });
      setSessionDistribution(Object.entries(distMap).map(([name, value]) => ({ name: `${name} sessions`, value })));

      // Avg companies per user
      const { data: companies } = await supabase
        .from("companies")
        .select("user_id")
        .gte("created_at", since);

      const userCompanies: Record<string, number> = {};
      (companies || []).forEach((c: { user_id: string }) => {
        userCompanies[c.user_id] = (userCompanies[c.user_id] || 0) + 1;
      });
      const companyUsers = Object.keys(userCompanies).length;
      const totalCompanies = Object.values(userCompanies).reduce((a, b) => a + b, 0);
      setAvgCompaniesPerUser(companyUsers > 0 ? Math.round((totalCompanies / companyUsers) * 10) / 10 : 0);

      // Job offers usage (users who looked at france travail)
      const { data: ftActivities } = await supabase
        .from("user_activity_logs")
        .select("user_id")
        .eq("action_type", "tab_change")
        .gte("created_at", since);

      setJobOffersUsage(new Set((ftActivities || []).map((a: { user_id: string }) => a.user_id)).size);

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
            <p className="text-sm text-muted-foreground">Sessions moyennes / utilisateur</p>
            <p className="text-3xl font-bold text-foreground">{avgSessionsPerUser}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Durée moy. session</p>
            <p className="text-3xl font-bold text-foreground">{avgTimePerSession} min</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Candidatures moy. / utilisateur</p>
            <p className="text-3xl font-bold text-foreground">{avgCompaniesPerUser}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Utilisateurs actifs sur les offres</p>
            <p className="text-3xl font-bold text-foreground">{jobOffersUsage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Session distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Distribution des sessions par utilisateur</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sessionDistribution}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Utilisateurs" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
