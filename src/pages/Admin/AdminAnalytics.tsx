import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Search, Mail } from "lucide-react";

interface AnalyticsData {
  emailsByDay: Array<{ date: string; count: number }>;
  searchModes: Array<{ name: string; value: number }>;
  topSectors: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

export const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    emailsByDay: [],
    searchModes: [],
    topSectors: [],
    topCities: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Emails by day (last 7 days)
        const { data: emailsData } = await supabase
          .from('email_campaigns')
          .select('sent_at')
          .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('sent_at', { ascending: true });

        const emailsByDay: Record<string, number> = {};
        emailsData?.forEach(email => {
          if (email.sent_at) {
            const date = new Date(email.sent_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            emailsByDay[date] = (emailsByDay[date] || 0) + 1;
          }
        });

        // Search modes from job_queue
        const { data: jobsData } = await supabase
          .from('job_queue')
          .select('search_params');

        let aiCount = 0;
        let manualCount = 0;
        jobsData?.forEach(job => {
          const params = job.search_params as any;
          if (params?.mode === 'ai') {
            aiCount++;
          } else {
            manualCount++;
          }
        });

        // Top sectors from companies
        const { data: companiesData } = await supabase
          .from('companies')
          .select('libelle_ape');

        const sectorCounts: Record<string, number> = {};
        companiesData?.forEach(company => {
          if (company.libelle_ape) {
            sectorCounts[company.libelle_ape] = (sectorCounts[company.libelle_ape] || 0) + 1;
          }
        });

        // Top cities from companies
        const { data: citiesData } = await supabase
          .from('companies')
          .select('ville');

        const cityCounts: Record<string, number> = {};
        citiesData?.forEach(company => {
          if (company.ville) {
            cityCounts[company.ville] = (cityCounts[company.ville] || 0) + 1;
          }
        });

        setData({
          emailsByDay: Object.entries(emailsByDay).map(([date, count]) => ({ date, count })),
          searchModes: [
            { name: 'Manuel', value: manualCount },
            { name: 'IA', value: aiCount }
          ],
          topSectors: Object.entries(sectorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name: name.slice(0, 30), count })),
          topCities: Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Comportement et tendances des utilisateurs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emails par jour */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Emails envoyés (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.emailsByDay.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Pas de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.emailsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Mode de recherche */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Mode de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.searchModes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.searchModes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Secteurs */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top 5 Secteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSectors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Pas de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topSectors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Villes */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top 5 Villes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Pas de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topCities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
