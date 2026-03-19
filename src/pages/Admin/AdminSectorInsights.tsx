import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Lightbulb, Search, Edit, Save, ExternalLink, Loader2, CheckCircle, Circle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface Profession {
  id: string;
  name: string;
  category: string | null;
  is_theme: boolean;
  profession_status: string;
  primary_keywords: string[];
  secondary_keywords: string[];
  soft_skills: string[];
  sector_description: string | null;
  recruiter_expectations: string | null;
}

export const AdminSectorInsights = () => {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterEnriched, setFilterEnriched] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Sheet state
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editExpectations, setEditExpectations] = useState("");
  const [saving, setSaving] = useState(false);

  // Stats
  const [totalActive, setTotalActive] = useState(0);
  const [totalEnriched, setTotalEnriched] = useState(0);

  useEffect(() => {
    loadProfessions();
  }, []);

  const loadProfessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ats_professions" as any)
      .select("id, name, category, is_theme, profession_status, primary_keywords, secondary_keywords, soft_skills, sector_description, recruiter_expectations")
      .eq("profession_status", "active")
      .order("is_theme", { ascending: false })
      .order("name");

    if (error) {
      toast.error("Erreur chargement");
    } else if (data) {
      const profs = (data as any[]).map(p => ({
        ...p,
        primary_keywords: (p.primary_keywords as string[]) || [],
        secondary_keywords: (p.secondary_keywords as string[]) || [],
        soft_skills: (p.soft_skills as string[]) || [],
      })) as Profession[];
      setProfessions(profs);

      const cats = [...new Set(profs.map(p => p.category).filter(Boolean))] as string[];
      setCategories(cats.sort());

      const enriched = profs.filter(p => p.sector_description && p.recruiter_expectations);
      setTotalActive(profs.length);
      setTotalEnriched(enriched.length);
    }
    setLoading(false);
  };

  const openEditor = (prof: Profession) => {
    setSelectedProfession(prof);
    setEditDescription(prof.sector_description || "");
    setEditExpectations(prof.recruiter_expectations || "");
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedProfession) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ats_professions" as any)
        .update({
          sector_description: editDescription || null,
          recruiter_expectations: editExpectations || null,
        })
        .eq("id", selectedProfession.id);
      if (error) throw error;

      toast.success("Mis à jour ✓");
      setSheetOpen(false);
      loadProfessions();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const isEnriched = (p: Profession) => !!(p.sector_description && p.recruiter_expectations);

  const filtered = professions.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchEnriched = filterEnriched === "all"
      || (filterEnriched === "enriched" && isEnriched(p))
      || (filterEnriched === "not_enriched" && !isEnriched(p));
    return matchSearch && matchCat && matchEnriched;
  });

  const completeness = totalActive > 0 ? Math.round((totalEnriched / totalActive) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10">
          <Lightbulb className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connaissances sectorielles</h1>
          <p className="text-muted-foreground text-sm">Enrichissez les métiers pour améliorer la génération IA</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Métiers actifs</p>
                <p className="text-2xl font-bold mt-1">{totalActive}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Métiers enrichis</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{totalEnriched}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Complétude</p>
                <p className="text-2xl font-bold mt-1">{completeness}%</p>
              </div>
              <div className="h-8 w-8 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary" style={{ opacity: completeness / 100 }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un métier ou catégorie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEnriched} onValueChange={setFilterEnriched}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Complétude" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="enriched">Enrichis</SelectItem>
            <SelectItem value="not_enriched">À enrichir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Aucun métier trouvé</div>
              ) : (
                filtered.map(prof => (
                  <div key={prof.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {isEnriched(prof)
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{prof.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {prof.category && (
                            <span className="text-xs text-muted-foreground">{prof.category}</span>
                          )}
                          <Badge variant={prof.is_theme ? "default" : "secondary"} className="text-xs h-4">
                            {prof.is_theme ? "Thème" : "Métier"}
                          </Badge>
                          <Badge variant={isEnriched(prof) ? "outline" : "destructive"} className="text-xs h-4">
                            {isEnriched(prof) ? "Enrichi" : "À enrichir"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEditor(prof)} className="shrink-0 ml-2">
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Éditer
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-right">{filtered.length} résultat(s)</p>

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedProfession && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  {selectedProfession.name}
                </SheetTitle>
                <SheetDescription>
                  {selectedProfession.category || "Sans catégorie"} · {selectedProfession.is_theme ? "Thème" : "Métier"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* ATS Data — read only */}
                <div className="rounded-lg bg-muted/50 border border-border/50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">Données ATS (lecture seule)</p>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/ats">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Modifier dans ATS
                      </Link>
                    </Button>
                  </div>

                  {selectedProfession.primary_keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Compétences principales</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfession.primary_keywords.slice(0, 15).map(kw => (
                          <Badge key={kw} variant="default" className="text-xs">{kw}</Badge>
                        ))}
                        {selectedProfession.primary_keywords.length > 15 && (
                          <Badge variant="secondary" className="text-xs">+{selectedProfession.primary_keywords.length - 15}</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedProfession.secondary_keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Compétences complémentaires</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfession.secondary_keywords.slice(0, 10).map(kw => (
                          <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                        {selectedProfession.secondary_keywords.length > 10 && (
                          <Badge variant="secondary" className="text-xs">+{selectedProfession.secondary_keywords.length - 10}</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedProfession.soft_skills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Soft skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfession.soft_skills.slice(0, 8).map(kw => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Editable fields */}
                <div className="space-y-5">
                  <p className="text-sm font-semibold">Connaissances pour la génération IA</p>

                  <div className="space-y-2">
                    <Label>Description du secteur</Label>
                    <Textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className="min-h-[120px] resize-y text-sm"
                      placeholder="Décris ce secteur : environnement, enjeux, culture, tendances. L'IA utilise ce texte comme contexte."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attentes des recruteurs</Label>
                    <Textarea
                      value={editExpectations}
                      onChange={e => setEditExpectations(e.target.value)}
                      className="min-h-[120px] resize-y text-sm"
                      placeholder="Qu'est-ce que les recruteurs cherchent dans une candidature pour ce secteur ? Quels signaux les convainquent ?"
                    />
                  </div>

                  <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ces informations + les keywords ATS sont automatiquement utilisés par l'IA lors de la génération d'emails et de lettres de motivation.
                    </p>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
