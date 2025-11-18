import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Mail, TrendingUp, AlertTriangle } from "lucide-react";

export const Statistics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    successful: 0,
    bounces: 0,
    pending: 0,
    successRate: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer toutes les campagnes
      const { data: campaigns, error } = await supabase
        .from("email_campaigns")
        .select("status")
        .eq("user_id", user.id);

      if (error) throw error;

      if (campaigns) {
        const totalSent = campaigns.filter(c => c.status === 'sent' || c.status === 'bounce').length;
        const successful = campaigns.filter(c => c.status === 'sent').length;
        const bounces = campaigns.filter(c => c.status === 'bounce').length;
        const pending = campaigns.filter(c => c.status === 'pending').length;
        const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;

        setStats({
          totalSent,
          successful,
          bounces,
          pending,
          successRate,
        });
      }
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques d'envoi</h1>
        <p className="text-muted-foreground">
          Suivez les performances réelles de vos campagnes d'emails
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total envoyés</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              Emails envoyés au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réussis</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <p className="text-xs text-muted-foreground">
              Emails délivrés avec succès
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounces</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.bounces}</div>
            <p className="text-xs text-muted-foreground">
              Emails non délivrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Emails réellement délivrés
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails des envois</CardTitle>
          <CardDescription>
            Vue d'ensemble de l'état de vos campagnes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Emails délivrés</span>
              </div>
              <span className="text-sm font-bold">{stats.successful}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Emails non délivrés (bounces)</span>
              </div>
              <span className="text-sm font-bold">{stats.bounces}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">En attente</span>
              </div>
              <span className="text-sm font-bold">{stats.pending}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des bounces</CardTitle>
          <CardDescription>
            Les emails non délivrés sont automatiquement détectés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              Le système vérifie automatiquement votre boîte mail pour détecter les bounces
              (emails non délivrés).
            </p>
            <p>
              Lorsqu'un email bounce et qu'une entreprise possède d'autres adresses email,
              le système retente automatiquement l'envoi avec une adresse alternative.
            </p>
            <p className="text-muted-foreground">
              Vous recevrez une notification pour chaque bounce détecté et chaque retry effectué.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
