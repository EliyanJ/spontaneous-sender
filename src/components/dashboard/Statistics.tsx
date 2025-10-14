import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Mail, Building2, CheckCircle2, XCircle, Clock, Target } from "lucide-react";

export function Statistics() {
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: emailLogs } = useQuery({
    queryKey: ["email-logs-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: blacklist } = useQuery({
    queryKey: ["blacklist-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_company_blacklist")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Calculs des statistiques
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter(c => c.status === "running").length || 0;
  const completedCampaigns = campaigns?.filter(c => c.status === "completed").length || 0;
  const draftCampaigns = campaigns?.filter(c => c.status === "draft").length || 0;

  const totalEmailsSent = campaigns?.reduce((sum, c) => sum + (c.sent_emails || 0), 0) || 0;
  const totalEmailsFailed = campaigns?.reduce((sum, c) => sum + (c.failed_emails || 0), 0) || 0;
  const totalEmailsPlanned = campaigns?.reduce((sum, c) => sum + (c.total_emails || 0), 0) || 0;

  const totalCompanies = companies?.length || 0;
  const companiesWithEmails = companies?.filter(c => {
    const emails = c.emails as any[];
    return emails && Array.isArray(emails) && emails.length > 0;
  }).length || 0;

  const totalBlacklisted = blacklist?.length || 0;

  const successRate = totalEmailsSent > 0 
    ? ((totalEmailsSent - totalEmailsFailed) / totalEmailsSent * 100).toFixed(1)
    : 0;

  const emailsPending = totalEmailsPlanned - totalEmailsSent - totalEmailsFailed;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Statistiques</h2>
        <p className="text-muted-foreground">Vue d'ensemble de vos campagnes et performances</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campagnes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {activeCampaigns} actives, {completedCampaigns} terminées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Envoyés</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmailsSent}</div>
            <p className="text-xs text-muted-foreground">
              Sur {totalEmailsPlanned} prévus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalEmailsFailed} échecs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {companiesWithEmails} avec emails trouvés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détails des campagnes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Statut des Campagnes</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Brouillons</span>
              </div>
              <span className="text-2xl font-bold">{draftCampaigns}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">En cours</span>
              </div>
              <span className="text-2xl font-bold">{activeCampaigns}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Terminées</span>
              </div>
              <span className="text-2xl font-bold">{completedCampaigns}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance des Emails</CardTitle>
            <CardDescription>Détails d'envoi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Envoyés avec succès</span>
              </div>
              <span className="text-2xl font-bold">{totalEmailsSent - totalEmailsFailed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Échecs</span>
              </div>
              <span className="text-2xl font-bold">{totalEmailsFailed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">En attente</span>
              </div>
              <span className="text-2xl font-bold">{emailsPending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Autres Métriques</CardTitle>
          <CardDescription>Informations complémentaires</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Entreprises Blacklistées</p>
              <p className="text-3xl font-bold">{totalBlacklisted}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taux de Collecte d'Emails</p>
              <p className="text-3xl font-bold">
                {totalCompanies > 0 ? ((companiesWithEmails / totalCompanies) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Moyenne Emails/Campagne</p>
              <p className="text-3xl font-bold">
                {totalCampaigns > 0 ? Math.round(totalEmailsSent / totalCampaigns) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des dernières campagnes */}
      {campaigns && campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières Campagnes</CardTitle>
            <CardDescription>Vos 5 campagnes les plus récentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.sent_emails}/{campaign.total_emails} emails
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      campaign.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
