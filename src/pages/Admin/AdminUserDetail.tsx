import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Mail, Search, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  phone: string | null;
  linkedin_url: string | null;
}

interface UserStats {
  companiesCount: number;
  emailsCount: number;
  searchesCount: number;
}

interface ActivityLog {
  id: string;
  action_type: string;
  action_data: any;
  created_at: string;
  duration_ms: number | null;
  session_id: string;
}

export const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ companiesCount: 0, emailsCount: 0, searchesCount: 0 });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        setProfile(profileData);

        // Fetch stats
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const { count: emailsCount } = await supabase
          .from('email_campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const { count: searchesCount } = await supabase
          .from('job_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        setStats({
          companiesCount: companiesCount || 0,
          emailsCount: emailsCount || 0,
          searchesCount: searchesCount || 0
        });

        // Fetch activities
        const { data: activitiesData } = await supabase
          .from('user_activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        setActivities(activitiesData || []);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      'session_start': { label: 'Session démarrée', color: 'bg-green-500/20 text-green-400' },
      'session_end': { label: 'Session terminée', color: 'bg-red-500/20 text-red-400' },
      'tab_change': { label: 'Navigation', color: 'bg-blue-500/20 text-blue-400' },
      'search_started': { label: 'Recherche', color: 'bg-yellow-500/20 text-yellow-400' },
      'search_completed': { label: 'Recherche terminée', color: 'bg-green-500/20 text-green-400' },
      'email_sent': { label: 'Email envoyé', color: 'bg-purple-500/20 text-purple-400' },
      'company_added': { label: 'Entreprise ajoutée', color: 'bg-cyan-500/20 text-cyan-400' },
    };
    return labels[actionType] || { label: actionType, color: 'bg-gray-500/20 text-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Utilisateur non trouvé</p>
        <Button onClick={() => navigate('/admin/users')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {profile.full_name || 'Utilisateur'}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{profile.id}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/20">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.companiesCount}</p>
              <p className="text-sm text-muted-foreground">Entreprises</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/20">
              <Mail className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.emailsCount}</p>
              <p className="text-sm text-muted-foreground">Emails envoyés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <Search className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.searchesCount}</p>
              <p className="text-sm text-muted-foreground">Recherches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Timeline d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune activité enregistrée pour cet utilisateur.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.map((activity) => {
                    const { label, color } = getActionLabel(activity.action_type);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={color}>{label}</Badge>
                          {activity.action_data && (
                            <span className="text-xs text-muted-foreground max-w-xs truncate">
                              {JSON.stringify(activity.action_data)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {activity.duration_ms && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(activity.duration_ms / 1000)}s
                            </span>
                          )}
                          <span>
                            {format(new Date(activity.created_at), "dd MMM HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Informations du profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium">{profile.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{profile.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <p className="font-medium">{profile.linkedin_url || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inscrit le</p>
                  <p className="font-medium">
                    {format(new Date(profile.created_at), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
