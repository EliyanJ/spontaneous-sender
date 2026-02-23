import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Building2, ExternalLink, RotateCcw, LayoutGrid, List, Bookmark, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

const TRANCHE_RANGES: Record<string, [number, number, string]> = {
  "00": [0, 0, "0"], "01": [1, 2, "1-2"], "02": [3, 5, "3-5"], "03": [6, 9, "6-9"],
  "11": [10, 19, "10-19"], "12": [20, 49, "20-49"], "21": [50, 99, "50-99"],
  "22": [100, 199, "100-199"], "32": [200, 249, "200-249"], "41": [250, 499, "250-499"],
  "42": [500, 999, "500-999"], "51": [1000, 1999, "1000-1999"], "52": [2000, 4999, "2000-4999"],
  "53": [5000, 8000, "5000+"],
};

function getEffectifLabel(code: string): string {
  const r = TRANCHE_RANGES[code];
  return r ? r[2] : "n.c.";
}

function getCompanyType(code: string): { label: string; color: string } {
  const r = TRANCHE_RANGES[code];
  if (!r) return { label: "PME", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" };
  const max = r[1];
  if (max <= 10) return { label: "Startup", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" };
  if (max <= 250) return { label: "PME", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" };
  if (max <= 1000) return { label: "ETI", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  return { label: "Grand groupe", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
}

const ITEMS_PER_PAGE = 12;

interface SearchResultsStepProps {
  companies: Company[];
  loading: boolean;
  savingCompany: string | null;
  onSaveCompany: (company: Company) => void;
  onSaveAll: () => void;
  onNewSearch: () => void;
}

export const SearchResultsStep = ({
  companies,
  loading,
  savingCompany,
  onSaveCompany,
  onSaveAll,
  onNewSearch,
}: SearchResultsStepProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("pertinence");
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(companies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompanies = companies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleBookmark = (siret: string) => {
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(siret)) next.delete(siret);
      else next.add(siret);
      return next;
    });
  };

  // Empty state
  if (companies.length === 0) {
    return (
      <div className="rounded-2xl bg-card/85 backdrop-blur-xl border border-border/50 p-12 text-center animate-fade-in">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Résultats</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Lance une recherche pour voir les entreprises ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Résultats
            <span className="text-sm font-normal text-muted-foreground">({companies.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">Basé sur tes critères de recherche</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-32 text-xs bg-card/80 border-border/50 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="pertinence">Pertinence</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="taille">Taille</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            onClick={onSaveAll}
            disabled={loading}
            size="sm"
            className="h-8 rounded-lg text-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Tout sauvegarder
          </Button>
        </div>
      </div>

      {/* Results Grid */}
      <div className={cn(
        "gap-3",
        viewMode === "grid"
          ? "grid grid-cols-1 md:grid-cols-2"
          : "flex flex-col"
      )}>
        {paginatedCompanies.map((company, index) => {
          const companyType = getCompanyType(company.effectif_code);
          const initial = company.nom.charAt(0).toUpperCase();
          const isSaving = savingCompany === company.siret;

          return (
            <div
              key={company.siret}
              className="group relative rounded-2xl bg-card/85 backdrop-blur-xl border border-border/50 p-4 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 animate-fade-in"
              style={{ 
                animationDelay: `${index * 40}ms`,
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px hsl(var(--primary) / 0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Bookmark */}
              <button
                onClick={() => toggleBookmark(company.siret)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <Bookmark className={cn("h-4 w-4", bookmarked.has(company.siret) && "fill-primary text-primary")} />
              </button>

              {/* Company Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-foreground">{initial}</span>
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {company.nom}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    📍 {company.ville} · {company.libelle_ape}
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", companyType.color)}>
                  {companyType.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20 font-medium">
                  {getEffectifLabel(company.effectif_code)} emp.
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 font-medium truncate max-w-[120px]">
                  {company.code_ape}
                </span>
              </div>

              {/* Description placeholder */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {company.adresse}, {company.code_postal} {company.ville}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSaveCompany(company)}
                  disabled={isSaving}
                  className="h-7 px-3 rounded-lg text-xs flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  Ajouter
                </Button>
                {company.website_url && (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Affichage {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, companies.length)} sur {companies.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                    currentPage === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
