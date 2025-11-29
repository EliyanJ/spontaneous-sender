import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Mail, 
  MapPin, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Company {
  id: string;
  nom: string;
  ville: string | null;
  code_postal: string | null;
  selected_email: string | null;
  status: string | null;
  pipeline_stage: string | null;
  website_url: string | null;
  libelle_ape: string | null;
}

interface Stats {
  totalSent: number;
  successful: number;
  bounces: number;
  pending: number;
  successRate: number;
  totalCompanies: number;
}

export const Entreprises = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    successful: 0,
    bounces: 0,
    pending: 0,
    successRate: 0,
    totalCompanies: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, nom, ville, code_postal, selected_email, status, pipeline_stage, website_url, libelle_ape")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load statistics
      const { data: campaigns, error: statsError } = await supabase
        .from("email_campaigns")
        .select("status")
        .eq("user_id", user.id);

      if (statsError) throw statsError;

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
          totalCompanies: companiesData?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "not sent": { label: "Non envoyé", variant: "secondary" },
      "sent": { label: "Envoyé", variant: "default" },
      "replied": { label: "Répondu", variant: "outline" },
      "bounce": { label: "Bounce", variant: "destructive" },
    };
    const cfg = config[status || "not sent"] || { label: status || "Non défini", variant: "secondary" };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Entreprises</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {companies.length} entreprise{companies.length > 1 ? 's' : ''} sauvegardée{companies.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Stats Panel Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiques
              <ChevronRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Statistiques d'envoi
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalSent}</p>
                        <p className="text-xs text-muted-foreground">Emails envoyés</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{stats.successful}</p>
                        <p className="text-xs text-muted-foreground">Réussis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{stats.bounces}</p>
                        <p className="text-xs text-muted-foreground">Bounces</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.successRate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Taux de succès</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress bar */}
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{stats.successful} / {stats.totalSent}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${stats.successRate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-card/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total entreprises</span>
                    <span className="font-semibold">{stats.totalCompanies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">En attente</span>
                    <span className="font-semibold">{stats.pending}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Companies List */}
      {companies.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune entreprise sauvegardée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Utilisez l'onglet Recherche pour trouver des entreprises
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {companies.map((company) => (
            <Card key={company.id} className="bg-card/50 hover:bg-card/70 transition-colors group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{company.nom}</h3>
                        {company.website_url && (
                          <a 
                            href={company.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {company.ville && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {company.ville}
                          </span>
                        )}
                        {company.selected_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {company.selected_email}
                          </span>
                        )}
                      </div>
                      {company.libelle_ape && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {company.libelle_ape}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-4">
                    {getStatusBadge(company.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
