import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  Star,
  StickyNote,
  CheckCircle2,
  Search,
  Mail,
  TrendingUp,
  BarChart3,
  Percent,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookmarkPlus,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ---------- types ----------
interface EmailRow {
  id: string;
  sent_at: string | null;
  subject: string;
  subject_type: string | null;
  tone: string | null;
  status: string | null;
  response_category: string | null;
  admin_score: number | null;
  admin_notes: string | null;
  user_id: string;
  company_id: string | null;
  // joined
  profile_full_name: string | null;
  company_nom: string | null;
  company_libelle_ape: string | null;
  company_ville: string | null;
  // local
  is_referenced: boolean;
}

interface Metrics {
  total: number;
  rated: number;
  avg_score: number;
  referenced: number;
  response_by_score: Record<string, { total: number; replied: number }>;
}

const PAGE_SIZE = 50;

// ---------- helpers ----------
const SCORE_FILTER_OPTIONS = [
  { value: "all", label: "Tous les scores" },
  { value: "none", label: "Non noté" },
  { value: "low", label: "1-2 ⭐" },
  { value: "mid", label: "3 ⭐" },
  { value: "high", label: "4-5 ⭐" },
];

const SUBJECT_TYPE_OPTIONS = [
  { value: "all", label: "Tous les types" },
  { value: "corporate", label: "Corporate" },
  { value: "value", label: "Value" },
  { value: "manager", label: "Manager" },
  { value: "question", label: "Question" },
];

const TONE_OPTIONS = [
  { value: "all", label: "Tous les tons" },
  { value: "formal", label: "Formal" },
  { value: "balanced", label: "Balanced" },
  { value: "direct", label: "Direct" },
  { value: "soft", label: "Soft" },
];

const RESPONSE_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "with", label: "Avec réponse" },
  { value: "without", label: "Sans réponse" },
];

const DATE_OPTIONS = [
  { value: "all", label: "Tout" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
];

function getDateFilter(range: string): string | null {
  const now = new Date();
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number | null;
  onChange: (score: number) => void;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-colors"
        >
          <Star
            className={cn(
              sz,
              (hovered || value || 0) >= s
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function NotesCell({
  rowId,
  notes,
  onSave,
}: {
  rowId: string;
  notes: string | null;
  onSave: (id: string, notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(notes || "");

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "transition-colors",
              notes ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{notes || "Ajouter une note"}</TooltipContent>
      </Tooltip>
      {open && (
        <div className="absolute z-50 right-0 top-6 w-64 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2">
          <Textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Notes admin..."
            rows={3}
            className="text-xs resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onSave(rowId, val);
                setOpen(false);
              }}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- main component ----------
export const AdminEmailQuality = () => {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    rated: 0,
    avg_score: 0,
    referenced: 0,
    response_by_score: {},
  });

  // filters
  const [scoreFilter, setScoreFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [toneFilter, setToneFilter] = useState("all");
  const [responseFilter, setResponseFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  // saving states
  const [savingScore, setSavingScore] = useState<string | null>(null);
  const [addingRef, setAddingRef] = useState<string | null>(null);

  // -------- fetch --------
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_campaigns")
        .select(
          `id, sent_at, subject, subject_type, tone, status, response_category,
           admin_score, admin_notes, user_id, company_id,
           profiles!email_campaigns_user_id_fkey(full_name),
           companies!email_campaigns_company_id_fkey(nom, libelle_ape, ville)`,
          { count: "exact" }
        )
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      // date
      const dateFrom = getDateFilter(dateFilter);
      if (dateFrom) query = query.gte("sent_at", dateFrom);

      // score
      if (scoreFilter === "none") query = query.is("admin_score", null);
      else if (scoreFilter === "low") query = query.in("admin_score", [1, 2]);
      else if (scoreFilter === "mid") query = query.eq("admin_score", 3);
      else if (scoreFilter === "high") query = query.in("admin_score", [4, 5]);

      // type & tone
      if (typeFilter !== "all") query = query.eq("subject_type", typeFilter);
      if (toneFilter !== "all") query = query.eq("tone", toneFilter);

      // response
      if (responseFilter === "with")
        query = query.not("response_category", "is", null);
      else if (responseFilter === "without")
        query = query.is("response_category", null);

      // text search
      if (search.trim())
        query = query.ilike("subject", `%${search.trim()}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      setTotalCount(count || 0);

      // check which ones are already referenced
      const ids = (data || []).map((r) => r.id);
      let referencedIds: string[] = [];
      if (ids.length > 0) {
        const { data: refs } = await supabase
          .from("email_subject_examples")
          .select("campaign_id")
          .in("campaign_id", ids);
        referencedIds = (refs || []).map((r) => r.campaign_id as string);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: EmailRow[] = (data || []).map((r: any) => ({
        id: r.id,
        sent_at: r.sent_at,
        subject: r.subject,
        subject_type: r.subject_type,
        tone: r.tone,
        status: r.status,
        response_category: r.response_category,
        admin_score: r.admin_score,
        admin_notes: r.admin_notes,
        user_id: r.user_id,
        company_id: r.company_id,
        profile_full_name: r.profiles?.full_name ?? null,
        company_nom: r.companies?.nom ?? null,
        company_libelle_ape: r.companies?.libelle_ape ?? null,
        company_ville: r.companies?.ville ?? null,
        is_referenced: referencedIds.includes(r.id),
      }));

      setRows(mapped);
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, scoreFilter, typeFilter, toneFilter, responseFilter, dateFilter, search]);

  // -------- metrics (full dataset, no pagination) --------
  const fetchMetrics = useCallback(async () => {
    try {
      const { data: all } = await supabase
        .from("email_campaigns")
        .select("admin_score, response_category")
        .not("sent_at", "is", null);

      if (!all) return;

      const total = all.length;
      const rated = all.filter((r) => r.admin_score !== null).length;
      const scores = all
        .filter((r) => r.admin_score !== null)
        .map((r) => r.admin_score as number);
      const avg_score =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;

      // referenced count
      const { count: refCount } = await supabase
        .from("email_subject_examples")
        .select("id", { count: "exact", head: true });

      // response by score
      const response_by_score: Record<string, { total: number; replied: number }> = {};
      for (const r of all) {
        const key = r.admin_score !== null ? String(r.admin_score) : "unrated";
        if (!response_by_score[key])
          response_by_score[key] = { total: 0, replied: 0 };
        response_by_score[key].total++;
        if (r.response_category) response_by_score[key].replied++;
      }

      setMetrics({
        total,
        rated,
        avg_score,
        referenced: refCount || 0,
        response_by_score,
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [scoreFilter, typeFilter, toneFilter, responseFilter, dateFilter, search]);

  // -------- actions --------
  const handleScoreChange = async (id: string, score: number) => {
    setSavingScore(id);
    const { error } = await supabase
      .from("email_campaigns")
      .update({ admin_score: score })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, admin_score: score } : r))
      );
      fetchMetrics();
    }
    setSavingScore(null);
  };

  const handleNotesSave = async (id: string, notes: string) => {
    const { error } = await supabase
      .from("email_campaigns")
      .update({ admin_notes: notes })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, admin_notes: notes } : r))
      );
      toast({ title: "Note sauvegardée" });
    }
  };

  const handleAddReference = async (row: EmailRow) => {
    setAddingRef(row.id);
    try {
      const { error } = await supabase.from("email_subject_examples").insert({
        subject_text: row.subject,
        context_data: {
          secteur: row.company_libelle_ape,
          ville: row.company_ville,
          type_objet: row.subject_type,
          ton: row.tone,
          nom_entreprise: row.company_nom,
        },
        admin_score: row.admin_score!,
        campaign_id: row.id,
      });

      if (error) throw error;

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_referenced: true } : r))
      );
      setMetrics((m) => ({ ...m, referenced: m.referenced + 1 }));
      toast({
        title: "✅ Ajouté aux exemples de référence",
        description: `"${row.subject.slice(0, 60)}…"`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setAddingRef(null);
    }
  };

  // -------- render helpers --------
  const statusBadge = (status: string | null) => {
    const map: Record<string, string> = {
      sent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      failed: "bg-red-500/15 text-red-500 border-red-500/30",
    };
    return (
      <Badge variant="outline" className={map[status || ""] || "bg-muted/30"}>
        {status || "—"}
      </Badge>
    );
  };

  const responseBadge = (cat: string | null) => {
    if (!cat) return <span className="text-muted-foreground text-xs">—</span>;
    const map: Record<string, string> = {
      positive: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      negative: "bg-red-500/15 text-red-500 border-red-500/30",
      neutral: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    };
    return (
      <Badge variant="outline" className={map[cat] || "bg-muted/30"}>
        {cat}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const ratePercent =
    metrics.total > 0 ? Math.round((metrics.rated / metrics.total) * 100) : 0;
  const refPercent =
    metrics.total > 0 ? Math.round((metrics.referenced / metrics.total) * 100) : 0;

  // response rate by score (sorted 1→5)
  const scoreKeys = ["1", "2", "3", "4", "5"].filter(
    (k) => metrics.response_by_score[k]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Qualité des objets</h1>
        <p className="text-muted-foreground mt-1">
          Notation & feedback loop sur les objets générés par l'IA
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Mail className="h-4 w-4" />
              Total envoyés
            </div>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Star className="h-4 w-4" />
              % Notés
            </div>
            <div className="text-2xl font-bold">
              {ratePercent}
              <span className="text-base font-normal text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">{metrics.rated} / {metrics.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Score moyen
            </div>
            <div className="text-2xl font-bold">
              {metrics.avg_score > 0 ? metrics.avg_score : "—"}
              {metrics.avg_score > 0 && (
                <span className="text-base font-normal text-muted-foreground">/5</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BookmarkPlus className="h-4 w-4" />
              Référencés
            </div>
            <div className="text-2xl font-bold">
              {refPercent}
              <span className="text-base font-normal text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">{metrics.referenced} exemples</p>
          </CardContent>
        </Card>

        {/* Response rate by score */}
        <Card className="bg-card/50 border-border/50 col-span-2 md:col-span-4 xl:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
              <TrendingUp className="h-4 w-4" />
              Taux réponse / score
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {scoreKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground">Pas encore de données</p>
            ) : (
              scoreKeys.map((k) => {
                const d = metrics.response_by_score[k];
                const pct = d.total > 0 ? Math.round((d.replied / d.total) * 100) : 0;
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-amber-400 font-bold">{k}★</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un objet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCORE_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={toneFilter} onValueChange={setToneFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={responseFilter} onValueChange={setResponseFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESPONSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Mail className="h-10 w-10 mb-2 opacity-40" />
              <p>Aucun email trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Utilisateur</TableHead>
                    <TableHead className="text-xs">Entreprise</TableHead>
                    <TableHead className="text-xs">Secteur</TableHead>
                    <TableHead className="text-xs min-w-[220px]">Objet</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Ton</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Réponse</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      {/* Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.sent_at
                          ? format(new Date(row.sent_at), "dd MMM yy", { locale: fr })
                          : "—"}
                      </TableCell>

                      {/* User */}
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {row.profile_full_name || (
                          <span className="text-muted-foreground">Inconnu</span>
                        )}
                      </TableCell>

                      {/* Company */}
                      <TableCell className="text-xs max-w-[100px] truncate font-medium">
                        {row.company_nom || "—"}
                      </TableCell>

                      {/* Sector */}
                      <TableCell className="text-xs max-w-[120px] truncate text-muted-foreground">
                        {row.company_libelle_ape || "—"}
                      </TableCell>

                      {/* Subject */}
                      <TableCell className="text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[220px] truncate cursor-default">
                              {row.subject}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[320px] text-xs">
                            {row.subject}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        {row.subject_type ? (
                          <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30">
                            {row.subject_type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Tone */}
                      <TableCell>
                        {row.tone ? (
                          <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 border-sky-500/30">
                            {row.tone}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>{statusBadge(row.status)}</TableCell>

                      {/* Response */}
                      <TableCell>{responseBadge(row.response_category)}</TableCell>

                      {/* Score */}
                      <TableCell>
                        <div className="flex items-center gap-1 min-w-[100px]">
                          {savingScore === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : (
                            <StarRating
                              value={row.admin_score}
                              onChange={(s) => handleScoreChange(row.id, s)}
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        <NotesCell
                          rowId={row.id}
                          notes={row.admin_notes}
                          onSave={handleNotesSave}
                        />
                      </TableCell>

                      {/* Reference button */}
                      <TableCell>
                        {row.admin_score !== null && row.admin_score >= 4 ? (
                          row.is_referenced ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Référencé ✓
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs whitespace-nowrap border-primary/40 text-primary hover:bg-primary/10"
                              disabled={addingRef === row.id}
                              onClick={() => handleAddReference(row)}
                            >
                              {addingRef === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <BookmarkPlus className="h-3 w-3 mr-1" />
                              )}
                              Ajouter
                            </Button>
                          )
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} sur {totalCount} emails
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
