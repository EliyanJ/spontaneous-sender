import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Mail, Search, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalEmailsSent: number;
  totalSearches: number;
  recentActivity: Array<{
    id: string;
    user_id: string;
    action_type: string;
    action_data: any;
    created_at: string;
    user_email?: string;
  }>;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCompanies: 0,
    totalEmailsSent: 0,
    totalSearches: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch companies count
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // Fetch emails sent count
        const { count: emailsCount } = await supabase
          .from('email_campaigns')
          .select('*', { count: 'exact', head: true });

        // Fetch job queue count (searches)
        const { count: searchesCount } = await supabase
          .from('job_queue')
          .select('*', { count: 'exact', head: true });

        // Fetch user roles to count users
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id');
        
        // Fetch recent activity
        const { data: activityData } = await supabase
          .from('user_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Count unique users from profiles
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: usersCount || 0,
          totalCompanies: companiesCount || 0,
          totalEmailsSent: emailsCount || 0,
          totalSearches: searchesCount || 0,
          recentActivity: activityData || []
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Entreprises", value: stats.totalCompanies, icon: Building2, color: "text-green-500" },
    { title: "Emails envoyés", value: stats.totalEmailsSent, icon: Mail, color: "text-purple-500" },
    { title: "Recherches", value: stats.totalSearches, icon: Search, color: "text-orange-500" },
  ];

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'session_start': '🟢 Session démarrée',
      'session_end': '🔴 Session terminée',
      'tab_change': '📑 Changement onglet',
      'search_started': '🔍 Recherche lancée',
      'search_completed': '✅ Recherche terminée',
      'email_sent': '📧 Email envoyé',
      'company_added': '🏢 Entreprise ajoutée',
    };
    return labels[actionType] || actionType;
  };

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
        <h1 className="text-3xl font-bold text-foreground">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de l'application</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune activité enregistrée. Le tracking commencera quand les utilisateurs utiliseront l'app.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {getActionLabel(activity.action_type)}
                    </span>
                    {activity.action_data && (
                      <span className="text-xs text-muted-foreground">
                        {JSON.stringify(activity.action_data).slice(0, 50)}...
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), "dd MMM HH:mm", { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
