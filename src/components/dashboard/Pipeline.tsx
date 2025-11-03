import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Pipeline = () => {
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

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-background">
          <CardTitle className="text-2xl">📊 Tracking candidature</CardTitle>
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
                    <div className="space-y-2">
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
  );
};
