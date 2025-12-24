import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Mail, Search, Clock, Activity, ExternalLink, Globe } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
  action_data: unknown;
  created_at: string;
  duration_ms: number | null;
  session_id: string;
}

interface Company {
  id: string;
  nom: string;
  ville: string | null;
  libelle_ape: string | null;
  website_url: string | null;
  selected_email: string | null;
  status: string | null;
  created_at: string;
}

interface EmailCampaign {
  id: string;
  recipient: string;
  subject: string;
  status: string | null;
  sent_at: string | null;
  response_category: string | null;
}

export const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState<UserStats>({ companiesCount: 0, emailsCount: 0, searchesCount: 0 });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [emails, setEmails] = useState<EmailCampaign[]>([]);
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

        // Fetch companies (last 20)
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, nom, ville, libelle_ape, website_url, selected_email, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        setCompanies(companiesData || []);

        // Fetch emails (last 20)
        const { data: emailsData } = await supabase
          .from('email_campaigns')
          .select('id, recipient, subject, status, sent_at, response_category')
          .eq('user_id', userId)
          .order('sent_at', { ascending: false })
          .limit(20);

        setEmails(emailsData || []);

        // Get email from edge function data if available
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase.functions.invoke('admin-get-users', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const userData = data?.users?.find((u: { id: string }) => u.id === userId);
          if (userData?.email) {
            setUserEmail(userData.email);
          }
        }

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
      'search_started': { label: 'Recherche lancée', color: 'bg-yellow-500/20 text-yellow-400' },
      'search_completed': { label: 'Recherche terminée', color: 'bg-green-500/20 text-green-400' },
      'search_companies': { label: 'Recherche entreprises', color: 'bg-yellow-500/20 text-yellow-400' },
      'email_sent': { label: 'Email envoyé', color: 'bg-purple-500/20 text-purple-400' },
      'company_added': { label: 'Entreprise ajoutée', color: 'bg-cyan-500/20 text-cyan-400' },
      'page_view': { label: 'Page vue', color: 'bg-gray-500/20 text-gray-400' },
    };
    return labels[actionType] || { label: actionType, color: 'bg-gray-500/20 text-gray-400' };
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, string> = {
      'sent': 'bg-green-500/20 text-green-400',
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'failed': 'bg-red-500/20 text-red-400',
      'not sent': 'bg-gray-500/20 text-gray-400'
    };
    return config[status || 'not sent'] || config['not sent'];
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
          <p className="text-sm text-primary">{userEmail}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{profile.id}</p>
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
          <TabsTrigger value="companies">Entreprises ({stats.companiesCount})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({stats.emailsCount})</TabsTrigger>
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

        <TabsContent value="companies" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Dernières entreprises ajoutées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companies.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune entreprise ajoutée.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Secteur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{company.nom}</span>
                            {company.website_url && (
                              <a 
                                href={company.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Globe className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{company.ville || '-'}</TableCell>
                        <TableCell className="text-xs">{company.libelle_ape || '-'}</TableCell>
                        <TableCell className="text-xs">{company.selected_email || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(company.status)}>
                            {company.status || 'non envoyé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(company.created_at), { addSuffix: true, locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Derniers emails envoyés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emails.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun email envoyé.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Réponse</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="text-sm">{email.recipient}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{email.subject}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(email.status)}>
                            {email.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {email.response_category ? (
                            <Badge variant="outline">{email.response_category}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {email.sent_at ? formatDistanceToNow(new Date(email.sent_at), { addSuffix: true, locale: fr }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{profile.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  {profile.linkedin_url ? (
                    <a 
                      href={profile.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Voir le profil <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
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