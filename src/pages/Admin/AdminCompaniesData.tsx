import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Search,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

interface CompanyRow {
  id: string;
  nom: string;
  ville: string | null;
  libelle_ape: string | null;
  website_url: string | null;
  company_insights: any;
  user_id: string;
  created_at: string | null;
}

const ScrapingBadge = ({ insights }: { insights: any }) => {
  if (!insights?.scraped_at) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
        <XCircle className="h-3.5 w-3.5" />
        Non scrappé
      </span>
    );
  }
  const hasContent = !!(insights?.full_content || insights?.content_preview);
  const scrapedDate = new Date(insights.scraped_at);
  const daysSince = Math.round(
    (Date.now() - scrapedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (!hasContent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <Clock className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-yellow-600 dark:text-yellow-400">Vide (il y a {daysSince}j)</span>
      </span>
    );
  }

  const charCount = (insights.full_content || insights.content_preview || "").length;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      <span className="text-green-600 dark:text-green-400">{charCount.toLocaleString()} chars — il y a {daysSince}j</span>
    </span>
  );
};

// ─── Detail Sheet ──────────────────────────────────────────────────────────────
const CompanySheet = ({
  company,
  open,
  onClose,
}: {
  company: CompanyRow | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!company) return null;

  const insights = company.company_insights;
  const scrapedContent =
    insights?.full_content || insights?.content_preview || null;
  const scrapedAt = insights?.scraped_at
    ? format(new Date(insights.scraped_at), "dd MMM yyyy 'à' HH:mm", {
        locale: fr,
      })
    : null;
  const charCount = scrapedContent?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[580px] sm:w-[660px] sm:max-w-[660px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold leading-snug pr-6 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            {company.nom}
          </SheetTitle>
          <div className="flex flex-wrap gap-2 mt-1">
            {company.ville && (
              <Badge variant="secondary" className="text-xs">
                {company.ville}
              </Badge>
            )}
            {company.libelle_ape && (
              <Badge variant="outline" className="text-xs max-w-[260px] truncate">
                {company.libelle_ape}
              </Badge>
            )}
            {company.website_url && (
              <a
                href={company.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Globe className="h-3 w-3" />
                {company.website_url.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-5">
            {/* Scraping status */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                Scraping
                {scrapedAt && (
                  <span className="text-xs text-muted-foreground/60">
                    — {scrapedAt}
                  </span>
                )}
              </div>
              <ScrapingBadge insights={insights} />
            </div>

            {/* Scraped content */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Contenu scrappé
                {charCount > 0 && (
                  <span className="normal-case font-normal ml-1 text-muted-foreground/50">
                    — {charCount.toLocaleString()} caractères
                  </span>
                )}
              </p>
              {scrapedContent ? (
                <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-xs text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                  {scrapedContent.length > 5000
                    ? scrapedContent.slice(0, 5000) +
                      `\n\n[… tronqué à 5 000 chars. Total : ${scrapedContent.length.toLocaleString()} chars]`
                    : scrapedContent}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-muted/20 rounded-lg border border-border/30 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  {company.website_url
                    ? "Le site a été scrappé mais aucun contenu exploitable n'a été récupéré (site bloqué, 403, JavaScript pur…)."
                    : "Aucun site web renseigné pour cette entreprise — le scraping n'a pas pu être effectué."}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminCompaniesData = () => {
  const [search, setSearch] = useState("");
  const [filterScraping, setFilterScraping] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-companies-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, nom, ville, libelle_ape, website_url, company_insights, user_id, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CompanyRow[];
    },
  });

  // Stats
  const totalCount = companies.length;
  const scrapedCount = companies.filter(
    (c) => c.company_insights?.scraped_at && (c.company_insights?.full_content || c.company_insights?.content_preview)
  ).length;
  const noWebsiteCount = companies.filter((c) => !c.website_url).length;
  const failedCount = companies.filter(
    (c) =>
      c.website_url &&
      c.company_insights?.scraped_at &&
      !c.company_insights?.full_content &&
      !c.company_insights?.content_preview
  ).length;

  // Filters
  const filtered = companies.filter((c) => {
    if (
      search &&
      !c.nom.toLowerCase().includes(search.toLowerCase()) &&
      !(c.ville ?? "").toLowerCase().includes(search.toLowerCase()) &&
      !(c.libelle_ape ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;

    if (filterScraping === "scraped") {
      return !!(
        c.company_insights?.scraped_at &&
        (c.company_insights?.full_content || c.company_insights?.content_preview)
      );
    }
    if (filterScraping === "not_scraped") {
      return !c.company_insights?.scraped_at;
    }
    if (filterScraping === "no_website") {
      return !c.website_url;
    }
    if (filterScraping === "failed") {
      return (
        !!c.website_url &&
        !!c.company_insights?.scraped_at &&
        !c.company_insights?.full_content &&
        !c.company_insights?.content_preview
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleRowClick = (c: CompanyRow) => {
    setSelectedCompany(c);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Données scrappées des entreprises
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisez le contenu récupéré sur les sites des entreprises — utilisé
          par l'IA pour personnaliser les lettres et emails
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total entreprises</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Scrappées avec contenu</p>
            <p className="text-2xl font-bold text-green-500">{scrapedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCount > 0
                ? `${Math.round((scrapedCount / totalCount) * 100)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sans site web</p>
            <p className="text-2xl font-bold text-muted-foreground">{noWebsiteCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Scraping échoué</p>
            <p className="text-2xl font-bold text-amber-500">{failedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">site bloqué / vide</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville, secteur…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={filterScraping}
          onValueChange={(v) => {
            setFilterScraping(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[190px] h-9">
            <SelectValue placeholder="Statut scraping" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="scraped">✅ Scrappées avec contenu</SelectItem>
            <SelectItem value="not_scraped">⬜ Jamais scrappées</SelectItem>
            <SelectItem value="no_website">🚫 Sans site web</SelectItem>
            <SelectItem value="failed">⚠️ Scraping vide/échoué</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} entreprise{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Entreprise
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Ville
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Secteur APE
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Site web
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Scraping
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    Aucune entreprise correspondante
                  </td>
                </tr>
              ) : (
                paginated.map((company, idx) => (
                  <tr
                    key={company.id}
                    onClick={() => handleRowClick(company)}
                    className={cn(
                      "border-b border-border/50 transition-colors cursor-pointer hover:bg-primary/5",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    {/* Nom */}
                    <td className="px-4 py-3 font-medium text-sm max-w-[200px] truncate">
                      {company.nom}
                    </td>
                    {/* Ville */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {company.ville ?? "—"}
                    </td>
                    {/* Secteur */}
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {company.libelle_ape ?? "—"}
                    </td>
                    {/* Site */}
                    <td className="px-4 py-3 text-xs max-w-[160px] truncate">
                      {company.website_url ? (
                        <span className="flex items-center gap-1 text-primary/70">
                          <Globe className="h-3 w-3 shrink-0" />
                          {company.website_url
                            .replace(/^https?:\/\//, "")
                            .slice(0, 30)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    {/* Scraping */}
                    <td className="px-4 py-3">
                      <ScrapingBadge insights={company.company_insights} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} / {totalPages} — {filtered.length} résultats
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <CompanySheet
        company={selectedCompany}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
};
