import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Brain, CheckCircle, XCircle, ArrowRight, Sparkles, Filter, ChevronLeft } from "lucide-react";

interface Profession {
  id: string;
  name: string;
  category: string | null;
  aliases: string[];
  excluded_words: string[];
  primary_keywords: string[];
  secondary_keywords: string[];
  soft_skills: string[];
  last_trained_at: string | null;
  training_count: number;
}

interface CvAnalysis {
  id: string;
  user_id: string;
  job_title: string;
  profession_name: string | null;
  profession_id: string | null;
  total_score: number;
  analysis_result: any;
  admin_reviewed: boolean;
  admin_feedback: any;
  created_at: string;
}

interface KeywordFeedback {
  keyword: string;
  original_category: string;
  corrected_category: string;
  is_valid: boolean;
  admin_notes: string;
  source: string;
}

const CATEGORIES = ["RH", "Marketing", "Communication", "Tech / IT", "Finance", "Commercial", "Juridique", "Santé", "Logistique", "Ingénierie", "Design", "Éducation", "Autre"];

export const AdminATSTraining = () => {
  const [tab, setTab] = useState("thematiques");
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [analyses, setAnalyses] = useState<CvAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterReviewed, setFilterReviewed] = useState<string>("unreviewed");
  const [feedbacks, setFeedbacks] = useState<Map<string, KeywordFeedback>>(new Map());
  const [adminNotes, setAdminNotes] = useState("");
  const [aiReviewing, setAiReviewing] = useState(false);

  useEffect(() => {
    loadProfessions();
    loadAnalyses();
  }, []);

  const loadProfessions = async () => {
    const { data } = await supabase.from("ats_professions").select("*");
    if (data) setProfessions(data.map(p => ({
      ...p,
      aliases: (p.aliases as string[]) || [],
      excluded_words: (p.excluded_words as string[]) || [],
      primary_keywords: (p.primary_keywords as string[]) || [],
      secondary_keywords: (p.secondary_keywords as string[]) || [],
      soft_skills: (p.soft_skills as string[]) || [],
    })));
  };

  const loadAnalyses = async () => {
    setLoading(true);
    let query = supabase.from("cv_analyses").select("*").order("created_at", { ascending: false }).limit(100);
    if (filterReviewed === "unreviewed") query = query.eq("admin_reviewed", false);
    if (filterReviewed === "reviewed") query = query.eq("admin_reviewed", true);
    const { data } = await query;
    if (data) setAnalyses(data as CvAnalysis[]);
    setLoading(false);
  };

  useEffect(() => { loadAnalyses(); }, [filterReviewed]);

  const openReview = (analysis: CvAnalysis) => {
    setSelectedAnalysis(analysis);
    setFeedbacks(new Map());
    setAdminNotes("");
    setTab("review");
  };

  const toggleKeywordFeedback = (keyword: string, originalCategory: string, action: "valid" | "invalid" | string) => {
    const newFeedbacks = new Map(feedbacks);
    if (action === "valid") {
      newFeedbacks.set(keyword, { keyword, original_category: originalCategory, corrected_category: originalCategory, is_valid: true, admin_notes: "", source: "manual" });
    } else if (action === "invalid") {
      newFeedbacks.set(keyword, { keyword, original_category: originalCategory, corrected_category: "excluded", is_valid: false, admin_notes: "", source: "manual" });
    } else {
      // Reclassify
      newFeedbacks.set(keyword, { keyword, original_category: originalCategory, corrected_category: action, is_valid: true, admin_notes: "", source: "manual" });
    }
    setFeedbacks(newFeedbacks);
  };

  const applyCorrections = async () => {
    if (!selectedAnalysis?.profession_id || feedbacks.size === 0) {
      toast.error("Aucune correction à appliquer");
      return;
    }

    setLoading(true);
    try {
      const profId = selectedAnalysis.profession_id;
      const prof = professions.find(p => p.id === profId);
      if (!prof) throw new Error("Profession non trouvée");

      const newExcluded = [...prof.excluded_words];
      const newPrimary = [...prof.primary_keywords];
      const newSecondary = [...prof.secondary_keywords];
      const newSoftSkills = [...prof.soft_skills];

      const feedbackInserts: any[] = [];

      for (const [, fb] of feedbacks) {
        feedbackInserts.push({
          profession_id: profId,
          keyword: fb.keyword,
          original_category: fb.original_category,
          corrected_category: fb.corrected_category,
          is_valid: fb.is_valid,
          admin_notes: fb.admin_notes || adminNotes,
          source: fb.source,
        });

        if (!fb.is_valid) {
          if (!newExcluded.includes(fb.keyword)) newExcluded.push(fb.keyword);
          // Remove from all categories
          const idx1 = newPrimary.indexOf(fb.keyword);
          if (idx1 > -1) newPrimary.splice(idx1, 1);
          const idx2 = newSecondary.indexOf(fb.keyword);
          if (idx2 > -1) newSecondary.splice(idx2, 1);
          const idx3 = newSoftSkills.indexOf(fb.keyword);
          if (idx3 > -1) newSoftSkills.splice(idx3, 1);
        } else if (fb.corrected_category !== fb.original_category) {
          // Remove from old, add to new
          for (const arr of [newPrimary, newSecondary, newSoftSkills]) {
            const idx = arr.indexOf(fb.keyword);
            if (idx > -1) arr.splice(idx, 1);
          }
          if (fb.corrected_category === "primary") newPrimary.push(fb.keyword);
          else if (fb.corrected_category === "secondary") newSecondary.push(fb.keyword);
          else if (fb.corrected_category === "soft_skill") newSoftSkills.push(fb.keyword);
        }
      }

      // Save feedbacks
      await supabase.from("ats_keyword_feedback").insert(feedbackInserts);

      // Update profession
      await supabase.from("ats_professions").update({
        excluded_words: newExcluded,
        primary_keywords: newPrimary,
        secondary_keywords: newSecondary,
        soft_skills: newSoftSkills,
        last_trained_at: new Date().toISOString(),
        training_count: (prof.training_count || 0) + feedbacks.size,
      }).eq("id", profId);

      // Mark analysis as reviewed
      await supabase.from("cv_analyses").update({
        admin_reviewed: true,
        admin_feedback: { notes: adminNotes, corrections_count: feedbacks.size },
      }).eq("id", selectedAnalysis.id);

      toast.success(`${feedbacks.size} corrections appliquées`);
      setSelectedAnalysis(null);
      setTab("analyses");
      loadProfessions();
      loadAnalyses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAiReview = async () => {
    if (!selectedAnalysis) return;
    setAiReviewing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ats-ai-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ analysis: selectedAnalysis }),
      });

      if (!res.ok) throw new Error("Erreur IA");
      const result = await res.json();

      if (result.suggestions) {
        const newFeedbacks = new Map(feedbacks);
        for (const s of result.suggestions) {
          newFeedbacks.set(s.keyword, {
            keyword: s.keyword,
            original_category: s.original_category,
            corrected_category: s.corrected_category,
            is_valid: s.is_valid,
            admin_notes: s.reason || "",
            source: "ai",
          });
        }
        setFeedbacks(newFeedbacks);
        toast.success(`${result.suggestions.length} suggestions IA chargées`);
      }
    } catch (err: any) {
      toast.error("Erreur lors de la revue IA: " + err.message);
    } finally {
      setAiReviewing(false);
    }
  };

  const getAnalysisKeywords = (analysis: CvAnalysis) => {
    const result = analysis.analysis_result;
    const keywords: Array<{ keyword: string; category: string; found: boolean }> = [];

    if (result?.primaryKeywords?.scores) {
      for (const s of result.primaryKeywords.scores) {
        keywords.push({ keyword: s.keyword, category: "primary", found: s.cvCount > 0 });
      }
    }
    if (result?.secondaryKeywords?.scores) {
      for (const s of result.secondaryKeywords.scores) {
        keywords.push({ keyword: s.keyword, category: "secondary", found: s.cvCount > 0 });
      }
    }
    if (result?.softSkills?.scores) {
      for (const s of result.softSkills.scores) {
        keywords.push({ keyword: s.skill, category: "soft_skill", found: s.found });
      }
    }
    return keywords;
  };

  const categoryColor = (cat: string) => {
    if (cat === "primary") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (cat === "secondary") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (cat === "soft_skill") return "bg-green-500/20 text-green-400 border-green-500/30";
    return "bg-muted text-muted-foreground";
  };

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ATS Training</h1>
          <p className="text-muted-foreground text-sm">Machine Learning itératif pour le scoring CV</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {professions.length} thématiques
          </Badge>
          <Badge variant="outline" className="text-xs">
            {analyses.filter(a => !a.admin_reviewed).length} à revoir
          </Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="thematiques">Thématiques</TabsTrigger>
          <TabsTrigger value="analyses">Analyses à revoir</TabsTrigger>
          {selectedAnalysis && <TabsTrigger value="review">Revue</TabsTrigger>}
        </TabsList>

        {/* ===== TAB: THEMATIQUES ===== */}
        <TabsContent value="thematiques">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {professions.map(prof => {
              const analysisCount = analyses.filter(a => a.profession_id === prof.id).length;
              return (
                <Card key={prof.id} className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{prof.name}</CardTitle>
                      {prof.category && <Badge variant="outline" className="text-xs">{prof.category}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{prof.primary_keywords.length} hard skills</span>
                      <span>{prof.secondary_keywords.length} secondary</span>
                      <span>{prof.soft_skills.length} soft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{analysisCount} analyses</span>
                      <span>{prof.training_count || 0} feedbacks</span>
                    </div>
                    {prof.excluded_words.length > 0 && (
                      <div className="text-xs text-orange-400">{prof.excluded_words.length} mots exclus</div>
                    )}
                    {prof.last_trained_at && (
                      <div className="text-xs">Dernier entraînement: {new Date(prof.last_trained_at).toLocaleDateString("fr-FR")}</div>
                    )}
                    {prof.aliases.length > 0 && (
                      <div className="text-xs text-muted-foreground">Alias: {prof.aliases.join(", ")}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== TAB: ANALYSES ===== */}
        <TabsContent value="analyses">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={filterReviewed} onValueChange={setFilterReviewed}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreviewed">Non revues</SelectItem>
                  <SelectItem value="reviewed">Déjà revues</SelectItem>
                  <SelectItem value="all">Toutes</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadAnalyses} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>

            <div className="space-y-2">
              {analyses.length === 0 && <p className="text-muted-foreground text-sm">Aucune analyse trouvée.</p>}
              {analyses.map(a => (
                <Card key={a.id} className="bg-card border-border/50 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openReview(a)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{a.job_title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.profession_name || "Non identifié"} · Score: {a.total_score}/100 · {new Date(a.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.admin_reviewed ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Revue</Badge>
                      ) : (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">À revoir</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB: REVIEW ===== */}
        <TabsContent value="review">
          {selectedAnalysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedAnalysis(null); setTab("analyses"); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
                <div>
                  <h3 className="font-semibold">{selectedAnalysis.job_title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedAnalysis.profession_name} · Score: {selectedAnalysis.total_score}/100
                  </p>
                </div>
              </div>

              {/* Keywords to review */}
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Mots-clés identifiés</CardTitle>
                    <Button variant="outline" size="sm" onClick={runAiReview} disabled={aiReviewing}>
                      <Sparkles className={`h-4 w-4 mr-1 ${aiReviewing ? "animate-spin" : ""}`} />
                      {aiReviewing ? "IA en cours..." : "Valider par IA"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getAnalysisKeywords(selectedAnalysis).map(kw => {
                    const fb = feedbacks.get(kw.keyword);
                    return (
                      <div key={kw.keyword} className="flex items-center gap-2 flex-wrap">
                        <Badge className={categoryColor(fb?.corrected_category || kw.category)}>
                          {kw.keyword}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({kw.category}) {kw.found ? "✓ trouvé" : "✗ absent"}
                        </span>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant={fb?.is_valid === true ? "default" : "outline"}
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleKeywordFeedback(kw.keyword, kw.category, "valid")}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={fb?.is_valid === false ? "destructive" : "outline"}
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleKeywordFeedback(kw.keyword, kw.category, "invalid")}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                          <Select onValueChange={(val) => toggleKeywordFeedback(kw.keyword, kw.category, val)}>
                            <SelectTrigger className="h-6 w-24 text-xs">
                              <SelectValue placeholder="Reclasser" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="soft_skill">Soft skill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {fb?.source === "ai" && (
                          <span className="text-xs text-primary">🤖 {fb.admin_notes}</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Admin notes & apply */}
              <Card className="bg-card border-border/50">
                <CardContent className="pt-4 space-y-3">
                  <Textarea
                    placeholder="Remarques générales sur cette analyse..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {feedbacks.size} correction(s) en attente
                    </span>
                    <Button onClick={applyCorrections} disabled={loading || feedbacks.size === 0}>
                      <Brain className="h-4 w-4 mr-1" />
                      Appliquer les corrections
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
