import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileText,
  X,
  BarChart2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  sector_tags: string[] | null;
  tone: string | null;
  is_active: boolean;
  usage_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  name: "",
  content: "",
  sector_tags: [] as string[],
  tone: "none" as string,
  admin_notes: "",
  is_active: true,
};

const TONE_OPTIONS = [
  { value: "none", label: "Tous les tons" },
  { value: "formal", label: "Formel" },
  { value: "balanced", label: "Équilibré" },
  { value: "direct", label: "Direct" },
  { value: "soft", label: "Soft" },
];

// ─── Tag Input ────────────────────────────────────────────────────────────────
const TagInput = ({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) => {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim().toLowerCase();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput("");
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: tech, finance, BTP…"
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-9 shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Form Dialog ──────────────────────────────────────────────────────────────
const TemplateFormDialog = ({
  open,
  onClose,
  initialData,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initialData: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  isSaving: boolean;
}) => {
  const [form, setForm] = useState(initialData);

  React.useEffect(() => {
    setForm(initialData);
  }, [initialData, open]);

  const set = (key: keyof typeof EMPTY_FORM, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    if (!form.content.trim()) {
      toast({ title: "Le contenu est requis", variant: "destructive" });
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {initialData.name ? "Modifier le template" : "Nouveau template LM"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Nom du template <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: LM Candidature spontanée — Tech"
              className="h-9"
            />
          </div>

          {/* Contenu */}
          <div className="space-y-1.5">
            <Label htmlFor="content" className="text-sm font-medium">
              Contenu de la lettre modèle <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Utilisez des variables comme{" "}
              <code className="bg-muted px-1 rounded text-[11px]">{"{{prenom}}"}</code>,{" "}
              <code className="bg-muted px-1 rounded text-[11px]">{"{{entreprise}}"}</code>,{" "}
              <code className="bg-muted px-1 rounded text-[11px]">{"{{poste}}"}</code>
            </p>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Madame, Monsieur,&#10;&#10;Passionné(e) par..."
              className="min-h-[300px] text-sm font-mono resize-y"
            />
          </div>

          {/* Secteurs + Ton */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tags secteurs</Label>
              <TagInput
                tags={form.sector_tags}
                onChange={(tags) => set("sector_tags", tags)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tone" className="text-sm font-medium">Ton</Label>
              <Select
                value={form.tone}
                onValueChange={(v) => set("tone", v)}
              >
                <SelectTrigger id="tone" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes admin */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes admin{" "}
              <span className="text-muted-foreground font-normal">(interne)</span>
            </Label>
            <Textarea
              id="notes"
              value={form.admin_notes}
              onChange={(e) => set("admin_notes", e.target.value)}
              placeholder="Observations, contexte d'utilisation…"
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          {/* Actif */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
            <Label htmlFor="is_active" className="text-sm cursor-pointer">
              Template actif (visible pour la génération IA)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminCoverLetterTemplates = () => {
  const qc = useQueryClient();

  const [filterTone, setFilterTone] = useState("all");
  const [filterSector, setFilterSector] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CoverLetterTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["cover-letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_letter_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CoverLetterTemplate[];
    },
  });

  // ── Save (create or update) ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (form: typeof EMPTY_FORM & { id?: string }) => {
      const payload = {
        name: form.name.trim(),
        content: form.content.trim(),
        sector_tags: form.sector_tags,
        tone: form.tone === "none" ? null : form.tone,
        admin_notes: form.admin_notes.trim() || null,
        is_active: form.is_active,
      };

      if (form.id) {
        const { error } = await supabase
          .from("cover_letter_templates")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cover_letter_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover-letter-templates"] });
      toast({ title: editingTemplate ? "Template modifié" : "Template créé" });
      setDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cover_letter_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cover-letter-templates"] }),
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const duplicateMutation = useMutation({
    mutationFn: async (tpl: CoverLetterTemplate) => {
      const { error } = await supabase.from("cover_letter_templates").insert({
        name: `${tpl.name} (copie)`,
        content: tpl.content,
        sector_tags: tpl.sector_tags,
        tone: tpl.tone,
        admin_notes: tpl.admin_notes,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover-letter-templates"] });
      toast({ title: "Template dupliqué" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cover_letter_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover-letter-templates"] });
      toast({ title: "Template supprimé" });
      setDeleteId(null);
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Open new form ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEdit = (tpl: CoverLetterTemplate) => {
    setEditingTemplate(tpl);
    setDialogOpen(true);
  };

  // ── Form initial data ─────────────────────────────────────────────────────
  const formInitial = editingTemplate
    ? {
        name: editingTemplate.name,
        content: editingTemplate.content,
        sector_tags: editingTemplate.sector_tags ?? [],
        tone: editingTemplate.tone ?? "none",
        admin_notes: editingTemplate.admin_notes ?? "",
        is_active: editingTemplate.is_active,
      }
    : EMPTY_FORM;

  // ── Collect all unique sectors for filter ─────────────────────────────────
  const allSectors = [
    ...new Set(templates.flatMap((t) => t.sector_tags ?? [])),
  ].sort();

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = templates.filter((t) => {
    if (filterTone !== "all") {
      const toneVal = filterTone === "none" ? null : filterTone;
      if (t.tone !== toneVal) return false;
    }
    if (filterSector && !(t.sector_tags ?? []).includes(filterSector)) return false;
    if (filterActive === "active" && !t.is_active) return false;
    if (filterActive === "inactive" && t.is_active) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Templates Lettres de Motivation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les modèles de lettres utilisés par l'IA pour générer les candidatures
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterTone} onValueChange={(v) => setFilterTone(v)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Ton" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tons</SelectItem>
            <SelectItem value="none">Non défini</SelectItem>
            <SelectItem value="formal">Formel</SelectItem>
            <SelectItem value="balanced">Équilibré</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="soft">Soft</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterSector || "all"}
          onValueChange={(v) => setFilterSector(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Secteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les secteurs</SelectItem>
            {allSectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterActive} onValueChange={(v) => setFilterActive(v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} template{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Aucun template</p>
          <p className="text-sm mt-1 mb-4">
            Créez votre premier modèle de lettre de motivation
          </p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className={cn(
                "border border-border rounded-xl bg-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow",
                !tpl.is_active && "opacity-60"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                  {tpl.name}
                </p>
                <Switch
                  checked={tpl.is_active}
                  onCheckedChange={(v) =>
                    toggleMutation.mutate({ id: tpl.id, is_active: v })
                  }
                  className="shrink-0 mt-0.5"
                />
              </div>

              {/* Preview */}
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                {tpl.content}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                {tpl.tone && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                    {tpl.tone}
                  </Badge>
                )}
                {(tpl.sector_tags ?? []).slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
                {(tpl.sector_tags ?? []).length > 4 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{(tpl.sector_tags ?? []).length - 4}
                  </Badge>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <span className="flex items-center gap-1">
                  <BarChart2 className="h-3 w-3" />
                  {tpl.usage_count} utilisation{tpl.usage_count !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(tpl.created_at), "dd MMM yy", { locale: fr })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => openEdit(tpl)}
                >
                  <Pencil className="h-3 w-3 mr-1.5" />
                  Éditer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Dupliquer"
                  onClick={() => duplicateMutation.mutate(tpl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  title="Supprimer"
                  onClick={() => setDeleteId(tpl.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <TemplateFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTemplate(null);
        }}
        initialData={formInitial}
        onSave={(form) =>
          saveMutation.mutate({
            ...form,
            id: editingTemplate?.id,
          } as typeof EMPTY_FORM & { id?: string })
        }
        isSaving={saveMutation.isPending}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le template sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
