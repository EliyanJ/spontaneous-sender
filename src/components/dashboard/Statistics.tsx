import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Building2, Target, CheckCircle2, XCircle } from "lucide-react";

export function Statistics() {
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
            <CardTitle className="text-sm font-medium">Taux de Succès</CardTitle>
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

      {/* Répartition par phase */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Phase</CardTitle>
            <CardDescription>Distribution des entreprises dans votre pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">📝 Nouveau</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.nouveau}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium">📧 Candidature envoyée</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.candidature_envoyee}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">⏳ En attente</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.en_attente}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">🔄 Relance</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.relance}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
            <CardDescription>État final des candidatures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-sm font-medium">🎯 Entretien</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.entretien}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">🎁 Offre reçue</span>
              </div>
              <span className="text-2xl font-bold">{parPhase.offre_recue}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">🎉 Accepté</span>
              </div>
              <span className="text-2xl font-bold text-emerald-600">{parPhase.accepte}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">❌ Refusé</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{parPhase.refuse}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
