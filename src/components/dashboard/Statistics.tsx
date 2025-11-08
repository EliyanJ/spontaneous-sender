import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Building2, Target, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function Statistics() {
  const { data: companies } = useQuery({
    queryKey: ["companies-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const totalCompanies = companies?.length || 0;
  
  const parPhase = {
    nouveau: companies?.filter(c => c.pipeline_stage === 'nouveau').length || 0,
    candidature_envoyee: companies?.filter(c => c.pipeline_stage === 'candidature_envoyee').length || 0,
    en_attente: companies?.filter(c => c.pipeline_stage === 'en_attente').length || 0,
    relance: companies?.filter(c => c.pipeline_stage === 'relance').length || 0,
    entretien: companies?.filter(c => c.pipeline_stage === 'entretien').length || 0,
    offre_recue: companies?.filter(c => c.pipeline_stage === 'offre_recue').length || 0,
    refuse: companies?.filter(c => c.pipeline_stage === 'refuse').length || 0,
    accepte: companies?.filter(c => c.pipeline_stage === 'accepte').length || 0,
  };

  const enCours = parPhase.candidature_envoyee + parPhase.en_attente + parPhase.relance + parPhase.entretien;
  const tauxSucces = totalCompanies > 0 ? ((parPhase.accepte / totalCompanies) * 100).toFixed(1) : 0;
  const tauxRefus = totalCompanies > 0 ? ((parPhase.refuse / totalCompanies) * 100).toFixed(1) : 0;

  // Données pour le graphique en barres
  const barChartData = [
    { name: "Nouveau", value: parPhase.nouveau, fill: "#3b82f6" },
    { name: "Candidature", value: parPhase.candidature_envoyee, fill: "#a855f7" },
    { name: "En attente", value: parPhase.en_attente, fill: "#eab308" },
    { name: "Relance", value: parPhase.relance, fill: "#f97316" },
    { name: "Entretien", value: parPhase.entretien, fill: "#6366f1" },
    { name: "Offre reçue", value: parPhase.offre_recue, fill: "#22c55e" },
    { name: "Refusé", value: parPhase.refuse, fill: "#ef4444" },
    { name: "Accepté", value: parPhase.accepte, fill: "#10b981" },
  ];

  // Données pour le graphique camembert
  const pieChartData = [
    { name: "Accepté", value: parPhase.accepte, color: "#10b981" },
    { name: "Refusé", value: parPhase.refuse, color: "#ef4444" },
    { name: "En cours", value: enCours, color: "#3b82f6" },
    { name: "Nouveau", value: parPhase.nouveau, color: "#94a3b8" },
    { name: "Offre reçue", value: parPhase.offre_recue, color: "#22c55e" },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Statistiques</h2>
        <p className="text-muted-foreground">Vue d'ensemble de vos candidatures</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entreprises</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              Dans votre pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enCours}</div>
            <p className="text-xs text-muted-foreground">
              Candidatures actives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réponse</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tauxSucces}%</div>
            <p className="text-xs text-muted-foreground">
              {parPhase.accepte} acceptées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Refus</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{tauxRefus}%</div>
            <p className="text-xs text-muted-foreground">
              {parPhase.refuse} refusées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Graphique en barres */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Répartition par Phase
            </CardTitle>
            <CardDescription>Distribution des entreprises dans votre pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique camembert */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Vue d'ensemble
            </CardTitle>
            <CardDescription>Statut global de vos candidatures</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails par phase */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Détails par Phase</CardTitle>
          <CardDescription>Vue détaillée de toutes les phases du pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {barChartData.map((phase) => (
              <div 
                key={phase.name} 
                className="p-4 rounded-lg border border-border hover:shadow-md transition-shadow"
                style={{ borderLeftWidth: '4px', borderLeftColor: phase.fill }}
              >
                <p className="text-sm text-muted-foreground mb-1">{phase.name}</p>
                <p className="text-3xl font-bold" style={{ color: phase.fill }}>
                  {phase.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalCompanies > 0 ? `${((phase.value / totalCompanies) * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
