import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Search, BarChart3, List } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Company {
  id: string;
  nom: string;
  ville: string;
  pipeline_stage: string;
  selected_email?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
  libelle_ape?: string | null;
}

interface PipelineStats {
  total: number;
  parPhase: Record<string, number>;
}

const PIPELINE_STAGES = [
  { value: "nouveau", label: "📝 Nouveau", color: "#3b82f6", colorClass: "border-blue-500" },
  { value: "candidature_envoyee", label: "📧 Candidature envoyée", color: "#a855f7", colorClass: "border-purple-500" },
  { value: "en_attente", label: "⏳ En attente", color: "#eab308", colorClass: "border-yellow-500" },
  { value: "relance", label: "🔄 Relance", color: "#f97316", colorClass: "border-orange-500" },
  { value: "entretien", label: "🎯 Entretien", color: "#6366f1", colorClass: "border-indigo-500" },
  { value: "offre_recue", label: "🎁 Offre reçue", color: "#22c55e", colorClass: "border-green-500" },
  { value: "refuse", label: "❌ Refusé", color: "#ef4444", colorClass: "border-red-500" },
  { value: "accepte", label: "🎉 Accepté", color: "#10b981", colorClass: "border-emerald-500" },
];

export const Pipeline = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingCompany, setUpdatingCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"list" | "stats">("list");
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

  useEffect(() => {
    const handler = () => {
      loadCompanies();
    };
    window.addEventListener('companies:updated', handler);
    return () => window.removeEventListener('companies:updated', handler);
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(c => 
      c.nom.toLowerCase().includes(query) ||
      c.ville?.toLowerCase().includes(query) ||
      c.libelle_ape?.toLowerCase().includes(query) ||
      c.selected_email?.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  const moveCompany = async (companyId: string, newStage: string) => {
    setUpdatingCompany(companyId);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ pipeline_stage: newStage })
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Phase mise à jour");
      await loadCompanies();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdatingCompany(null);
    }
  };

  const pieChartData = useMemo(() => {
    return PIPELINE_STAGES
      .filter(stage => stats.parPhase[stage.value] > 0)
      .map(stage => ({
        name: stage.label.replace(/^[^\s]+ /, ''),
        value: stats.parPhase[stage.value],
        color: stage.color,
      }));
  }, [stats]);

  const barChartData = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      name: stage.label.replace(/^[^\s]+ /, ''),
      count: stats.parPhase[stage.value] || 0,
      fill: stage.color,
    }));
  }, [stats]);

  const getCompanyCard = (company: Company) => {
    const currentStage = PIPELINE_STAGES.find(s => s.value === company.pipeline_stage);
    const isUpdating = updatingCompany === company.id;
    
    const getStatusBadge = () => {
      if (!company.status) return null;
      
      const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        "not sent": { label: "Non envoyé", variant: "secondary" },
        "sent": { label: "Envoyé", variant: "default" },
        "replied": { label: "Répondu", variant: "outline" },
      };
      
      const config = statusConfig[company.status] || { label: company.status, variant: "secondary" };
      return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
    };
    
    return (
      <Card 
        key={company.id} 
        className={`mb-2 hover:shadow-md transition-shadow border-l-4 ${currentStage?.colorClass} ${isUpdating ? 'opacity-60' : ''}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm">{company.nom}</h4>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2">📍 {company.ville}</p>
          
          {company.selected_email && (
            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{company.selected_email}</span>
            </div>
          )}
          
          <Select 
            value={company.pipeline_stage} 
            onValueChange={(value) => moveCompany(company.id, value)}
            disabled={isUpdating}
          >
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl">📊 Tracking candidature</CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "stats")}>
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Liste</span>
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Statistiques</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {activeView === "list" && (
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, ville, secteur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {filteredCompanies.length} résultat{filteredCompanies.length > 1 ? 's' : ''} sur {companies.length}
                  </p>
                )}
              </div>

              {/* Pipeline Stages */}
              <div className="space-y-6">
                {PIPELINE_STAGES.map((stage) => {
                  const companiesInStage = filteredCompanies.filter(c => c.pipeline_stage === stage.value);
                  
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
            </>
          )}

          {activeView === "stats" && (
            <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total entreprises</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-purple-500">
                      {stats.parPhase["candidature_envoyee"] || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Candidatures envoyées</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-500">
                      {stats.parPhase["entretien"] || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Entretiens</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-500">
                      {stats.parPhase["accepte"] || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Acceptés</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Répartition par phase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pieChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Aucune donnée à afficher
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nombre par phase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Rates */}
              {stats.total > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Taux de conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {((stats.parPhase["candidature_envoyee"] || 0) / stats.total * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Taux d'envoi</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-indigo-500">
                          {stats.parPhase["candidature_envoyee"] 
                            ? ((stats.parPhase["entretien"] || 0) / stats.parPhase["candidature_envoyee"] * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Envoi → Entretien</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-500">
                          {stats.parPhase["entretien"]
                            ? ((stats.parPhase["accepte"] || 0) / stats.parPhase["entretien"] * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Entretien → Accepté</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
