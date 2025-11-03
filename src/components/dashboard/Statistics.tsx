import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Company {
  id: string;
  nom: string;
  ville: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
}

interface PipelineStats {
  total: number;
  parPhase: Record<string, number>;
}

const PIPELINE_STAGES = [
  { value: "nouveau", label: "📝 Nouveau", color: "border-blue-500" },
  { value: "candidature_envoyee", label: "📧 Candidature envoyée", color: "border-purple-500" },
  { value: "en_attente", label: "⏳ En attente", color: "border-yellow-500" },
  { value: "relance", label: "🔄 Relance", color: "border-orange-500" },
  { value: "entretien", label: "🎯 Entretien", color: "border-indigo-500" },
  { value: "offre_recue", label: "🎁 Offre reçue", color: "border-green-500" },
  { value: "refuse", label: "❌ Refusé", color: "border-red-500" },
  { value: "accepte", label: "🎉 Accepté", color: "border-emerald-500" },
];

export const Statistics = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PipelineStats>({
    total: 0,
    parPhase: {}
  });

  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (companiesData: Company[]) => {
    const parPhase: Record<string, number> = {};
    PIPELINE_STAGES.forEach(stage => {
      parPhase[stage.value] = companiesData.filter(c => c.pipeline_stage === stage.value).length;
    });

    setStats({
      total: companiesData.length,
      parPhase
    });
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const moveCompany = async (companyId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ pipeline_stage: newStage })
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Phase mise à jour");
      loadCompanies();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const getCompanyCard = (company: Company) => {
    const currentStage = PIPELINE_STAGES.find(s => s.value === company.pipeline_stage);
    
    return (
      <Card 
        key={company.id} 
        className={`mb-2 hover:shadow-md transition-shadow border-l-4 ${currentStage?.color}`}
      >
        <CardContent className="p-3">
          <h4 className="font-semibold text-sm mb-1">{company.nom}</h4>
          <p className="text-xs text-muted-foreground mb-2">📍 {company.ville}</p>
          
          <Select value={company.pipeline_stage} onValueChange={(value) => moveCompany(company.id, value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const enCours = (stats.parPhase.candidature_envoyee || 0) + 
                  (stats.parPhase.en_attente || 0) + 
                  (stats.parPhase.relance || 0) + 
                  (stats.parPhase.entretien || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Colonne Statistiques */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-background pb-3">
            <CardTitle className="text-lg">📊 Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Total Entreprises</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
                <Activity className="h-4 w-4 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">En cours</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-500">{enCours}</p>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Taux de succès</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-green-500">
                  {stats.total > 0 
                    ? Math.round(((stats.parPhase.accepte || 0) / stats.total) * 100) 
                    : 0}%
                </p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Taux de refus</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-red-500">
                  {stats.total > 0 
                    ? Math.round(((stats.parPhase.refuse || 0) / stats.total) * 100) 
                    : 0}%
                </p>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-semibold">Par phase</p>
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.value} className="flex items-center justify-between">
                  <span className="text-xs">{stage.label}</span>
                  <span className="text-sm font-bold">{stats.parPhase[stage.value] || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Colonne Pipeline */}
      <div className="lg:col-span-3">
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-background">
            <CardTitle className="text-2xl">🎯 Pipeline CRM</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {PIPELINE_STAGES.map((stage) => {
                const companiesInStage = companies.filter(c => c.pipeline_stage === stage.value);
                
                return (
                  <div key={stage.value}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{stage.label}</h3>
                      <span className="text-sm font-bold text-muted-foreground">
                        {companiesInStage.length} entreprise{companiesInStage.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {companiesInStage.length === 0 ? (
                      <div className="text-center py-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Aucune entreprise</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {companiesInStage.map(company => getCompanyCard(company))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
