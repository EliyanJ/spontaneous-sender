import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { 
  Loader2, 
  Search, 
  MapPin, 
  Building2, 
  Sparkles, 
  X, 
  Info,
  CheckCircle,
  Mail
} from "lucide-react";

// Liste des départements français
const DEPARTMENTS = [
  { code: "01", name: "Ain" },
  { code: "02", name: "Aisne" },
  { code: "03", name: "Allier" },
  { code: "04", name: "Alpes-de-Haute-Provence" },
  { code: "05", name: "Hautes-Alpes" },
  { code: "06", name: "Alpes-Maritimes" },
  { code: "07", name: "Ardèche" },
  { code: "08", name: "Ardennes" },
  { code: "09", name: "Ariège" },
  { code: "10", name: "Aube" },
  { code: "11", name: "Aude" },
  { code: "12", name: "Aveyron" },
  { code: "13", name: "Bouches-du-Rhône" },
  { code: "14", name: "Calvados" },
  { code: "15", name: "Cantal" },
  { code: "16", name: "Charente" },
  { code: "17", name: "Charente-Maritime" },
  { code: "18", name: "Cher" },
  { code: "19", name: "Corrèze" },
  { code: "2A", name: "Corse-du-Sud" },
  { code: "2B", name: "Haute-Corse" },
  { code: "21", name: "Côte-d'Or" },
  { code: "22", name: "Côtes-d'Armor" },
  { code: "23", name: "Creuse" },
  { code: "24", name: "Dordogne" },
  { code: "25", name: "Doubs" },
  { code: "26", name: "Drôme" },
  { code: "27", name: "Eure" },
  { code: "28", name: "Eure-et-Loir" },
  { code: "29", name: "Finistère" },
  { code: "30", name: "Gard" },
  { code: "31", name: "Haute-Garonne" },
  { code: "32", name: "Gers" },
  { code: "33", name: "Gironde" },
  { code: "34", name: "Hérault" },
  { code: "35", name: "Ille-et-Vilaine" },
  { code: "36", name: "Indre" },
  { code: "37", name: "Indre-et-Loire" },
  { code: "38", name: "Isère" },
  { code: "39", name: "Jura" },
  { code: "40", name: "Landes" },
  { code: "41", name: "Loir-et-Cher" },
  { code: "42", name: "Loire" },
  { code: "43", name: "Haute-Loire" },
  { code: "44", name: "Loire-Atlantique" },
  { code: "45", name: "Loiret" },
  { code: "46", name: "Lot" },
  { code: "47", name: "Lot-et-Garonne" },
  { code: "48", name: "Lozère" },
  { code: "49", name: "Maine-et-Loire" },
  { code: "50", name: "Manche" },
  { code: "51", name: "Marne" },
  { code: "52", name: "Haute-Marne" },
  { code: "53", name: "Mayenne" },
  { code: "54", name: "Meurthe-et-Moselle" },
  { code: "55", name: "Meuse" },
  { code: "56", name: "Morbihan" },
  { code: "57", name: "Moselle" },
  { code: "58", name: "Nièvre" },
  { code: "59", name: "Nord" },
  { code: "60", name: "Oise" },
  { code: "61", name: "Orne" },
  { code: "62", name: "Pas-de-Calais" },
  { code: "63", name: "Puy-de-Dôme" },
  { code: "64", name: "Pyrénées-Atlantiques" },
  { code: "65", name: "Hautes-Pyrénées" },
  { code: "66", name: "Pyrénées-Orientales" },
  { code: "67", name: "Bas-Rhin" },
  { code: "68", name: "Haut-Rhin" },
  { code: "69", name: "Rhône" },
  { code: "70", name: "Haute-Saône" },
  { code: "71", name: "Saône-et-Loire" },
  { code: "72", name: "Sarthe" },
  { code: "73", name: "Savoie" },
  { code: "74", name: "Haute-Savoie" },
  { code: "75", name: "Paris" },
  { code: "76", name: "Seine-Maritime" },
  { code: "77", name: "Seine-et-Marne" },
  { code: "78", name: "Yvelines" },
  { code: "79", name: "Deux-Sèvres" },
  { code: "80", name: "Somme" },
  { code: "81", name: "Tarn" },
  { code: "82", name: "Tarn-et-Garonne" },
  { code: "83", name: "Var" },
  { code: "84", name: "Vaucluse" },
  { code: "85", name: "Vendée" },
  { code: "86", name: "Vienne" },
  { code: "87", name: "Haute-Vienne" },
  { code: "88", name: "Vosges" },
  { code: "89", name: "Yonne" },
  { code: "90", name: "Territoire de Belfort" },
  { code: "91", name: "Essonne" },
  { code: "92", name: "Hauts-de-Seine" },
  { code: "93", name: "Seine-Saint-Denis" },
  { code: "94", name: "Val-de-Marne" },
  { code: "95", name: "Val-d'Oise" },
  { code: "971", name: "Guadeloupe" },
  { code: "972", name: "Martinique" },
  { code: "973", name: "Guyane" },
  { code: "974", name: "La Réunion" },
  { code: "976", name: "Mayotte" },
];

// Secteurs porteurs pour la recherche automatique (codes APE)
const SECTEURS_PORTEURS = [
  "6201Z", // Programmation informatique
  "6202A", // Conseil en systèmes
  "6311Z", // Traitement de données
  "7022Z", // Conseil pour les affaires
  "7112B", // Ingénierie
  "6420Z", // Activités des sièges sociaux
  "4791B", // Commerce de détail
  "8299Z", // Autres activités de soutien aux entreprises
  "7010Z", // Activités des sièges sociaux
  "4690Z", // Commerce de gros
];

interface AutomaticSearchProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AutomaticSearch = ({ onNavigateToTab }: AutomaticSearchProps) => {
  const { features } = usePlanFeatures();
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyCount, setCompanyCount] = useState(features.maxCompaniesPerSearch.toString());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ found: number; saved: number } | null>(null);

  const filteredDepartments = DEPARTMENTS.filter(
    dept => 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.includes(searchQuery)
  );

  const handleSelectDepartment = (code: string) => {
    if (selectedDepartments.includes(code)) {
      setSelectedDepartments(prev => prev.filter(d => d !== code));
    } else if (selectedDepartments.length < 5) {
      setSelectedDepartments(prev => [...prev, code]);
    } else {
      toast.error("Maximum 5 départements");
    }
  };

  const handleSearch = async () => {
    if (selectedDepartments.length === 0) {
      toast.error("Sélectionnez au moins un département");
      return;
    }

    const count = parseInt(companyCount) || 20;
    if (count < 1 || count > features.maxCompaniesPerSearch) {
      toast.error(`Le nombre doit être entre 1 et ${features.maxCompaniesPerSearch}`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Connexion requise");
        return;
      }

      // Sélectionner des codes APE aléatoires
      const shuffledSectors = [...SECTEURS_PORTEURS].sort(() => Math.random() - 0.5);
      const selectedSectors = shuffledSectors.slice(0, 3);

      // Construire les codes postaux à partir des départements
      const codePostalPrefixes = selectedDepartments;

      // Appeler l'API de recherche
      const allResults: any[] = [];
      
      for (const codeApe of selectedSectors) {
        const searchPayload = {
          codeApe,
          locations: codePostalPrefixes,
          nombre: Math.ceil(count / selectedSectors.length),
          userId: user.id,
          minEmployees: 5,
          maxEmployees: 100,
        };

        const { data: searchData, error: searchError } = await supabase.functions.invoke(
          'search-companies',
          { body: searchPayload }
        );

        if (!searchError && searchData?.success && searchData?.data) {
          allResults.push(...searchData.data);
        }
      }

      // Dédupliquer par SIREN
      const uniqueResults = Array.from(
        new Map(allResults.map(c => [c.siren, c])).values()
      ).slice(0, count);

      if (uniqueResults.length === 0) {
        toast.error("Aucune entreprise trouvée dans cette zone");
        setLoading(false);
        return;
      }

      // Générer un batch ID
      const searchBatchId = crypto.randomUUID();
      const searchBatchDate = new Date().toISOString();

      // Vérifier les entreprises déjà existantes
      const { data: existing } = await supabase
        .from('companies')
        .select('siren')
        .eq('user_id', user.id);

      const existingSirens = new Set((existing || []).map((c: any) => c.siren));
      
      const toInsert = uniqueResults
        .filter(c => !existingSirens.has(c.siren))
        .map(company => ({
          user_id: user.id,
          siren: company.siren,
          siret: company.siret,
          nom: company.nom,
          adresse: company.adresse,
          code_postal: company.code_postal,
          ville: company.ville,
          code_ape: company.code_ape,
          libelle_ape: company.libelle_ape,
          nature_juridique: company.nature_juridique,
          tranche_effectif: company.effectif_code,
          website_url: company.website_url ?? null,
          search_batch_id: searchBatchId,
          search_batch_date: searchBatchDate,
        }));

      if (toInsert.length === 0) {
        toast.info("Toutes les entreprises sont déjà dans votre liste");
        setLoading(false);
        return;
      }

      // Insérer les entreprises
      const { error: insertError } = await supabase.from('companies').insert(toInsert);
      if (insertError) throw insertError;

      // Stocker le batch ID
      sessionStorage.setItem('latest_search_batch_id', searchBatchId);
      sessionStorage.setItem('latest_search_batch_count', String(toInsert.length));

      window.dispatchEvent(new CustomEvent('companies:updated'));
      
      setResult({ found: uniqueResults.length, saved: toInsert.length });
      toast.success(`${toInsert.length} entreprise(s) ajoutée(s) à votre liste`);

    } catch (error) {
      console.error('Erreur recherche automatique:', error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCompanies = () => {
    if (onNavigateToTab) {
      onNavigateToTab('entreprises');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Recherche automatique</span>
        </div>
        <h2 className="text-2xl font-bold">Trouvez des entreprises automatiquement</h2>
        <p className="text-muted-foreground">
          Sélectionnez vos départements et nous trouverons des entreprises pour vous
        </p>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Zone géographique
          </CardTitle>
          <CardDescription>
            Sélectionnez jusqu'à 5 départements (max: {features.maxCompaniesPerSearch} entreprises)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Departments */}
          {selectedDepartments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedDepartments.map(code => {
                const dept = DEPARTMENTS.find(d => d.code === code);
                return (
                  <Badge 
                    key={code} 
                    variant="secondary"
                    className="gap-1 px-3 py-1"
                  >
                    {code} - {dept?.name}
                    <button 
                      onClick={() => handleSelectDepartment(code)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Department Grid */}
          <ScrollArea className="h-48 rounded-lg border">
            <div className="grid grid-cols-2 gap-1 p-2">
              {filteredDepartments.map(dept => (
                <button
                  key={dept.code}
                  onClick={() => handleSelectDepartment(dept.code)}
                  className={`
                    text-left px-3 py-2 rounded-lg text-sm transition-all
                    ${selectedDepartments.includes(dept.code)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                    }
                  `}
                >
                  <span className="font-medium">{dept.code}</span>
                  <span className="ml-2 text-xs opacity-80">{dept.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Count Input */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="company-count">Nombre d'entreprises</Label>
              <Input
                id="company-count"
                type="number"
                min="1"
                max={features.maxCompaniesPerSearch}
                value={companyCount}
                onChange={(e) => setCompanyCount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="text-sm text-muted-foreground pt-6">
              Max: {features.maxCompaniesPerSearch}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Les entreprises seront sélectionnées aléatoirement parmi les secteurs porteurs 
              (informatique, conseil, ingénierie...). Les emails seront recherchés automatiquement.
            </p>
          </div>

          {/* Search Button */}
          <Button
            className="w-full gap-2"
            onClick={handleSearch}
            disabled={loading || selectedDepartments.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Lancer la recherche automatique
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Recherche terminée !</h4>
                <p className="text-sm text-muted-foreground">
                  {result.found} entreprise(s) trouvée(s), {result.saved} ajoutée(s) à votre liste
                </p>
              </div>
              <Button 
                onClick={() => {
                  sessionStorage.setItem('emails_initial_section', 'search');
                  onNavigateToTab?.('emails');
                }} 
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Rechercher les emails de contact
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Banner */}
      <UpgradeBanner
        variant="compact"
        title="Recherche avancée"
        description="Passez au plan Plus pour rechercher par secteur d'activité et ville précise"
        features={[
          "Recherche IA par mots-clés",
          "Sélection manuelle des secteurs",
          "Localisation par ville",
          "Jusqu'à 200 entreprises par recherche"
        ]}
      />
    </div>
  );
};
