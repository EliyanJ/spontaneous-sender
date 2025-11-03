import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Building2, 
  FileText, 
  Clock, 
  RefreshCcw, 
  Calendar,
  CheckCircle,
  XCircle,
  Gift,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  { value: "nouveau", label: "📝 Nouveau", icon: Building2, color: "bg-blue-500" },
  { value: "candidature_envoyee", label: "📧 Candidature envoyée", icon: FileText, color: "bg-purple-500" },
  { value: "en_attente", label: "⏳ En attente", icon: Clock, color: "bg-yellow-500" },
  { value: "relance", label: "🔄 Relance", icon: RefreshCcw, color: "bg-orange-500" },
  { value: "entretien", label: "🎯 Entretien", icon: Calendar, color: "bg-indigo-500" },
  { value: "offre_recue", label: "🎁 Offre reçue", icon: Gift, color: "bg-green-500" },
  { value: "refuse", label: "❌ Refusé", icon: XCircle, color: "bg-red-500" },
  { value: "accepte", label: "🎉 Accepté", icon: CheckCircle, color: "bg-emerald-500" },
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

  const getCompanyCard = (company: Company) => (
    <Card 
      key={company.id} 
      className="mb-3 hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: PIPELINE_STAGES.find(s => s.value === company.pipeline_stage)?.color.replace('bg-', '') }}
    >
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-2">{company.nom}</h4>
        <p className="text-xs text-muted-foreground mb-3">📍 {company.ville}</p>
        
        <div className="flex gap-1 flex-wrap">
          {PIPELINE_STAGES.map((stage) => (
            company.pipeline_stage !== stage.value && (
              <Button
                key={stage.value}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => moveCompany(company.id, stage.value)}
              >
                {stage.label.split(' ')[0]}
              </Button>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );

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
    <div className="space-y-6">
      {/* Pipeline Kanban */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-background">
          <CardTitle className="text-2xl">Pipeline CRM</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              const companiesInStage = companies.filter(c => c.pipeline_stage === stage.value);
              
              return (
                <div key={stage.value} className="flex flex-col">
                  <div className={`${stage.color} text-white p-3 rounded-t-lg flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold text-sm">{stage.label}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {companiesInStage.length}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-b-lg min-h-[400px] max-h-[500px] overflow-y-auto">
                    {companiesInStage.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Aucune entreprise
                      </p>
                    ) : (
                      companiesInStage.map(company => getCompanyCard(company))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entreprises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {enCours}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de succès
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.total > 0 
                ? Math.round(((stats.parPhase.accepte || 0) / stats.total) * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de refus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {stats.total > 0 
                ? Math.round(((stats.parPhase.refuse || 0) / stats.total) * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
