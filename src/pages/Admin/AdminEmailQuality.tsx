import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MessageSquareText,
  BookmarkPlus,
  BookmarkCheck,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmailRow {
  id: string;
  subject: string;
  subject_type: string | null;
  tone: string | null;
  sent_at: string | null;
  admin_score: number | null;
  admin_notes: string | null;
  response_category: string | null;
  user_name: string | null;
  company_name: string | null;
  sector: string | null;
  ville: string | null;
  is_referenced: boolean;
}

interface Metrics {
  total: number;
  rated: number;
  avg_score: number;
  examples_count: number;
}

const PAGE_SIZE = 50;

// ─── Star Rating ─────────────────────────────────────────────────────────────
const StarRating = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="p-0.5 rounded transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors",
              star <= display
                ? "fill-primary text-primary"
                : "fill-none text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Notes Popover ───────────────────────────────────────────────────────────
const NotesPopover = ({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (notes: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "p-1 rounded-md transition-colors",
            value
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
          )}
          title={value ? "Voir / modifier la note" : "Ajouter une note"}
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Note admin
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Observation sur cet objet…"
          className="text-sm min-h-[80px] resize-none"
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 text-xs"
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(draft);
              setOpen(false);
            }}
            className="h-7 text-xs"
          >
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Response Badge ───────────────────────────────────────────────────────────
const ResponseBadge = ({ category }: { category: string | null }) => {
  if (!category) return <span className="text-muted-foreground/40 text-xs">—</span>;

  const variants: Record<string, { label: string; className: string }> = {
    positive: {
      label: "Positive",
      className: "bg-primary/10 text-primary",
    },
    negative: {
      label: "Négative",
      className: "bg-destructive/10 text-destructive",
    },
    neutral: {
      label: "Neutre",
      className: "bg-muted text-muted-foreground",
    },
  };

  const v = variants[category] ?? variants.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
        v.className
      )}
    >
      {v.label}
    </span>
  );
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <Card className="border-border/50">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminEmailQuality = () => {
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTone, setFilterTone] = useState("all");
  const [filterResponse, setFilterResponse] = useState("all");
  const [page, setPage] = useState(0);

  // ── Fetch emails ──────────────────────────────────────────────────────────
  const { data: rawEmails = [], isLoading } = useQuery({
    queryKey: ["admin-email-quality-raw"],
    queryFn: async () => {
      // Fetch email_campaigns (sent)
      const { data: campaigns, error: ec } = await supabase
        .from("email_campaigns")
        .select(
          "id, subject, subject_type, tone, sent_at, admin_score, admin_notes, response_category, user_id, company_id"
        )
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(2000);

      if (ec) throw ec;

      // Fetch referenced campaign ids
      const { data: examples } = await supabase
        .from("email_subject_examples")
        .select("campaign_id");

      const referencedIds = new Set(
        (examples ?? [])
          .map((e) => e.campaign_id)
          .filter(Boolean) as string[]
      );

      // Collect user_ids and company_ids to batch-fetch
      const userIds = [...new Set((campaigns ?? []).map((c) => c.user_id).filter(Boolean))];
      const companyIds = [...new Set((campaigns ?? []).map((c) => c.company_id).filter(Boolean))];

      const [profilesRes, companiesRes] = await Promise.all([
        userIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds as string[])
          : { data: [] },
        companyIds.length > 0
          ? supabase
              .from("companies")
              .select("id, nom, libelle_ape, ville")
              .in("id", companyIds as string[])
          : { data: [] },
      ]);

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, p.full_name])
      );
      const companyMap = new Map(
        (companiesRes.data ?? []).map((c) => [c.id, c])
      );

      return (campaigns ?? []).map((ec) => {
        const co = companyMap.get(ec.company_id ?? "");
        return {
          id: ec.id,
          subject: ec.subject,
          subject_type: ec.subject_type,
          tone: ec.tone,
          sent_at: ec.sent_at,
          admin_score: ec.admin_score,
          admin_notes: ec.admin_notes,
          response_category: ec.response_category,
          user_name: profileMap.get(ec.user_id) ?? null,
          company_name: co?.nom ?? null,
          sector: co?.libelle_ape ?? null,
          ville: co?.ville ?? null,
          is_referenced: referencedIds.has(ec.id),
        } as EmailRow;
      });
    },
  });

  // ── Metrics ───────────────────────────────────────────────────────────────
  const { data: metrics } = useQuery({
    queryKey: ["admin-email-quality-metrics"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("email_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");

      const { data: scored } = await supabase
        .from("email_campaigns")
        .select("admin_score")
        .eq("status", "sent")
        .not("admin_score", "is", null);

      const { count: exCount } = await supabase
        .from("email_subject_examples")
        .select("*", { count: "exact", head: true });

      const scores = (scored ?? []).map((s) => s.admin_score as number);
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      return {
        total: total ?? 0,
        rated: scores.length,
        avg_score: avg,
        examples_count: exCount ?? 0,
      } as Metrics;
    },
  });

  // ── Update score ──────────────────────────────────────────────────────────
  const scoreMutation = useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      const { error } = await supabase
        .from("email_campaigns")
        .update({ admin_score: score })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-email-quality-raw"] });
      qc.invalidateQueries({ queryKey: ["admin-email-quality-metrics"] });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Update notes ──────────────────────────────────────────────────────────
  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("email_campaigns")
        .update({ admin_notes: notes || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-email-quality-raw"] });
      toast({ title: "Note sauvegardée" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Add to examples ───────────────────────────────────────────────────────
  const addExampleMutation = useMutation({
    mutationFn: async (row: EmailRow) => {
      const { error } = await supabase.from("email_subject_examples").insert({
        subject_text: row.subject,
        admin_score: row.admin_score!,
        campaign_id: row.id,
        context_data: {
          secteur: row.sector,
          ville: row.ville,
          type_objet: row.subject_type,
          ton: row.tone,
          nom_entreprise: row.company_name,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-email-quality-raw"] });
      qc.invalidateQueries({ queryKey: ["admin-email-quality-metrics"] });
      toast({ title: "Objet ajouté aux exemples ✓" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = rawEmails.filter((row) => {
    if (
      search &&
      !row.subject.toLowerCase().includes(search.toLowerCase())
    )
      return false;

    if (filterScore === "unrated" && row.admin_score !== null) return false;
    if (filterScore === "1-2" && (row.admin_score === null || row.admin_score > 2))
      return false;
    if (filterScore === "3" && row.admin_score !== 3) return false;
    if (filterScore === "4-5" && (row.admin_score === null || row.admin_score < 4))
      return false;

    if (filterType !== "all" && row.subject_type !== filterType) return false;
    if (filterTone !== "all" && row.tone !== filterTone) return false;

    if (filterResponse === "with" && !row.response_category) return false;
    if (filterResponse === "without" && row.response_category) return false;

    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
      (val: string) => {
        setter(val);
        setPage(0);
      },
    []
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Qualité des objets d'emails
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notez et référencez les meilleurs objets générés par l'IA
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Emails envoyés" value={metrics?.total ?? "—"} />
        <MetricCard
          label="% notés"
          value={
            metrics && metrics.total > 0
              ? `${Math.round((metrics.rated / metrics.total) * 100)}%`
              : "—"
          }
          sub={`${metrics?.rated ?? 0} notés`}
        />
        <MetricCard
          label="Score moyen"
          value={
            metrics && metrics.avg_score > 0
              ? metrics.avg_score.toFixed(1)
              : "—"
          }
          sub="sur 5"
        />
        <MetricCard
          label="Exemples référencés"
          value={metrics?.examples_count ?? "—"}
          sub="dans la base d'apprentissage"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les objets…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-9"
          />
        </div>

        <Select value={filterScore} onValueChange={handleFilterChange(setFilterScore)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les scores</SelectItem>
            <SelectItem value="unrated">Non notés</SelectItem>
            <SelectItem value="1-2">⭐ 1-2</SelectItem>
            <SelectItem value="3">⭐ 3</SelectItem>
            <SelectItem value="4-5">⭐ 4-5</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={handleFilterChange(setFilterType)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="value">Value</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="question">Question</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTone} onValueChange={handleFilterChange(setFilterTone)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Ton" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tons</SelectItem>
            <SelectItem value="formal">Formel</SelectItem>
            <SelectItem value="balanced">Équilibré</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="soft">Soft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterResponse} onValueChange={handleFilterChange(setFilterResponse)}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Réponse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="with">Avec réponse</SelectItem>
            <SelectItem value="without">Sans réponse</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Entreprise</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Secteur</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Objet</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Ton</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Réponse</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Notes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Exemple</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-muted-foreground">
                    Aucun email correspondant aux filtres
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-muted/30",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {row.sent_at
                        ? format(new Date(row.sent_at), "dd MMM yy", { locale: fr })
                        : "—"}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap max-w-[120px] truncate">
                      {row.user_name ?? <span className="text-muted-foreground/50">—</span>}
                    </td>

                    {/* Entreprise */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap max-w-[130px] truncate font-medium">
                      {row.company_name ?? <span className="text-muted-foreground/50">—</span>}
                    </td>

                    {/* Secteur */}
                    <td className="px-4 py-3 text-xs max-w-[140px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[120px] cursor-default text-muted-foreground">
                            {row.sector ?? "—"}
                          </span>
                        </TooltipTrigger>
                        {row.sector && (
                          <TooltipContent side="top">{row.sector}</TooltipContent>
                        )}
                      </Tooltip>
                    </td>

                    {/* Objet */}
                    <td className="px-4 py-3 text-xs max-w-[280px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate cursor-default font-medium">
                            {row.subject.length > 60
                              ? row.subject.slice(0, 60) + "…"
                              : row.subject}
                          </span>
                        </TooltipTrigger>
                        {row.subject.length > 60 && (
                          <TooltipContent
                            side="top"
                            className="max-w-sm whitespace-normal"
                          >
                            {row.subject}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {row.subject_type ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                          {row.subject_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    {/* Ton */}
                    <td className="px-4 py-3">
                      {row.tone ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {row.tone}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    {/* Réponse */}
                    <td className="px-4 py-3">
                      <ResponseBadge category={row.response_category} />
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <StarRating
                        value={row.admin_score}
                        onChange={(score) =>
                          scoreMutation.mutate({ id: row.id, score })
                        }
                      />
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3">
                      <NotesPopover
                        value={row.admin_notes}
                        onSave={(notes) =>
                          notesMutation.mutate({ id: row.id, notes })
                        }
                      />
                    </td>

                    {/* Ajouter aux exemples */}
                    <td className="px-4 py-3">
                      {(row.admin_score ?? 0) >= 4 ? (
                        row.is_referenced ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <BookmarkCheck className="h-3.5 w-3.5" />
                            Référencé
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addExampleMutation.mutate(row)}
                            disabled={addExampleMutation.isPending}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium disabled:opacity-50"
                          >
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            Ajouter
                          </button>
                        )
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
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
    </div>
  );
};
