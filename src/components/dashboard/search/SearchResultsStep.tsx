import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Building2, ExternalLink, ArrowLeft, RotateCcw } from "lucide-react";

interface Company {
  siren: string;
  siret: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_ape: string;
  libelle_ape: string;
  nature_juridique: string;
  effectif_code: string;
  website_url?: string | null;
}

// Helpers
const TRANCHE_RANGES: Record<string, [number, number, string]> = {
  "00": [0, 0, "0"], "01": [1, 2, "1-2"], "02": [3, 5, "3-5"], "03": [6, 9, "6-9"],
  "11": [10, 19, "10-19"], "12": [20, 49, "20-49"], "21": [50, 99, "50-99"],
  "22": [100, 199, "100-199"], "32": [200, 249, "200-249"], "41": [250, 499, "250-499"],
  "42": [500, 999, "500-999"], "51": [1000, 1999, "1000-1999"], "52": [2000, 4999, "2000-4999"],
  "53": [5000, 8000, "5000+"],
};

function hashString(str: string) {
  let h = 5381; for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

function seededBetween(seed: string, min: number, max: number) {
  if (min >= max) return min;
  const h = hashString(seed);
  return min + (h % (max - min + 1));
}

function prettyEstimate(code: string, siren: string) {
  const r = TRANCHE_RANGES[code]; if (!r) return "n.c.";
  const [min, max, label] = r;
  if (min === max) return label;
  const val = seededBetween(siren, min, max);
  return `${val} (~${label})`;
}

interface SearchResultsStepProps {
  companies: Company[];
  loading: boolean;
  savingCompany: string | null;
  onSaveCompany: (company: Company) => void;
  onSaveAll: () => void;
  onBack: () => void;
  onNewSearch: () => void;
}

export const SearchResultsStep = ({
  companies,
  loading,
  savingCompany,
  onSaveCompany,
  onSaveAll,
  onBack,
  onNewSearch
}: SearchResultsStepProps) => {
  if (companies.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Aucun résultat trouvé</h3>
        <p className="text-muted-foreground mb-6">Essayez avec d'autres critères de recherche</p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Modifier les filtres
          </Button>
          <Button onClick={onNewSearch} className="rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" />
            Nouvelle recherche
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Filtres
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{companies.length} entreprise{companies.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={onNewSearch}
            className="rounded-xl"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Nouvelle recherche
          </Button>
          <Button 
            onClick={onSaveAll} 
            disabled={loading}
            className="btn-premium rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Tout sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results Grid - Max 20 visible, no scroll for 1920x1080 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {companies.slice(0, 20).map((company, index) => (
          <div
            key={company.siret}
            className="group p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-2">
                {company.nom}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSaveCompany(company)}
                disabled={savingCompany === company.siret}
                className="shrink-0 h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
              >
                {savingCompany === company.siret ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              📍 {company.code_postal} {company.ville}
            </p>
            
            <p className="text-xs font-medium text-primary mb-2">
              👥 {prettyEstimate(company.effectif_code, company.siren)}
            </p>
            
            {company.website_url && (
              <a 
                href={company.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{company.website_url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        ))}
      </div>

      {companies.length > 20 && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          +{companies.length - 20} autres résultats disponibles
        </p>
      )}
    </div>
  );
};
