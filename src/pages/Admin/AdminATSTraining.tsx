import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  RefreshCw, Brain, CheckCircle, XCircle, ArrowRight, Sparkles, ChevronLeft, Plus, X, Save,
  Upload, FileText, Loader2, Zap, FolderOpen, Briefcase, AlertCircle, ChevronRight, TrendingUp, Settings2
} from "lucide-react";



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
  parent_theme_id: string | null;
  is_theme: boolean;
  profession_status: string;
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
  needs_profession_suggestion?: boolean;
}

interface KeywordFeedback {
  keyword: string;
  original_category: string;
  corrected_category: string;
  is_valid: boolean;
  admin_notes: string;
  source: string;
}

interface SuggestedKeyword {
  keyword: string;
  category: string;
  accepted: boolean | null;
}

interface ProfessionSuggestion {
  suggested_job_name: string;
  suggested_theme_name: string;
  is_new_theme: boolean;
  confidence: number;
  reasoning: string;
  primary_keywords: string[];
  secondary_keywords: string[];
  soft_skills: string[];
  aliases: string[];
}

interface JobCluster {
  id: string;
  normalized_title: string;
  raw_titles: string[];
  analysis_ids: string[];
  analysis_count: number;
  keyword_frequencies: Record<string, number[]>;
  suggested_profession_id: string | null;
  status: string;
  cluster_threshold: number;
  created_at: string;
  updated_at: string;
}



const CATEGORIES = ["RH", "Marketing", "Communication", "Tech / IT", "Finance", "Commercial", "Juridique", "Santé", "Logistique", "Ingénierie", "Design", "Éducation", "Autre"];

export const AdminATSTraining = () => {
  const [tab, setTab] = useState("thematiques");
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [analyses, setAnalyses] = useState<CvAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterReviewed, setFilterReviewed] = useState<string>("unreviewed");
  const [feedbacks, setFeedbacks] = useState<Map<string, KeywordFeedback>>(new Map());
  const [adminNotes, setAdminNotes] = useState("");
  const [aiReviewing, setAiReviewing] = useState(false);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, done: false });

  // New profession suggestion state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [profSuggestion, setProfSuggestion] = useState<ProfessionSuggestion | null>(null);
  const [editSuggestion, setEditSuggestion] = useState<ProfessionSuggestion | null>(null);
  const [creatingFromSuggestion, setCreatingFromSuggestion] = useState(false);

  // Theme editing state
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [editParentThemeId, setEditParentThemeId] = useState<string>("");
  const [editIsTheme, setEditIsTheme] = useState(true);
  const [editCategory, setEditCategory] = useState("");
  const [editAliases, setEditAliases] = useState<string[]>([]);
  const [editPrimary, setEditPrimary] = useState<string[]>([]);
  const [editSecondary, setEditSecondary] = useState<string[]>([]);
  const [editSoftSkills, setEditSoftSkills] = useState<string[]>([]);
  const [editExcluded, setEditExcluded] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [newPrimary, setNewPrimary] = useState("");
  const [newSecondary, setNewSecondary] = useState("");
  const [newSoftSkill, setNewSoftSkill] = useState("");
  const [newExcluded, setNewExcluded] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newProfName, setNewProfName] = useState("");

  // File import state
  const [importing, setImporting] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<SuggestedKeyword[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfessions();
    loadAnalyses();
  }, []);

  const loadProfessions = async () => {
    const { data } = await supabase.from("ats_professions").select("*").order("is_theme", { ascending: false }).order("name");
    if (data) setProfessions(data.map(p => ({
      ...p,
      aliases: (p.aliases as string[]) || [],
      excluded_words: (p.excluded_words as string[]) || [],
      primary_keywords: (p.primary_keywords as string[]) || [],
      secondary_keywords: (p.secondary_keywords as string[]) || [],
      soft_skills: (p.soft_skills as string[]) || [],
      parent_theme_id: (p as any).parent_theme_id || null,
      is_theme: (p as any).is_theme ?? true,
      profession_status: (p as any).profession_status || 'active',
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

  // ===== COMPUTED: hierarchy =====
  const themes = professions.filter(p => p.is_theme && !p.parent_theme_id);
  const getChildJobs = (themeId: string) => professions.filter(p => p.parent_theme_id === themeId);
  const pendingReview = professions.filter(p => p.profession_status === 'pending_review');
  const orphanJobs = professions.filter(p => !p.is_theme && !p.parent_theme_id); // jobs without a theme parent

  // ===== THEME EDITING =====
  const openThemeEditor = (prof: Profession, presetParentThemeId?: string, presetIsTheme?: boolean) => {
    setEditingProfession(prof);
    setEditCategory(prof.category || "");
    setEditAliases([...prof.aliases]);
    setEditPrimary([...prof.primary_keywords]);
    setEditSecondary([...prof.secondary_keywords]);
    setEditSoftSkills([...prof.soft_skills]);
    setEditExcluded([...prof.excluded_words]);
    setEditParentThemeId(presetParentThemeId ?? prof.parent_theme_id ?? "");
    setEditIsTheme(presetIsTheme !== undefined ? presetIsTheme : prof.is_theme);
    setSuggestedKeywords([]);
    setTab("edit-theme");
  };

  const openNewProfessionForm = (parentThemeId?: string) => {
    const skeleton: Profession = {
      id: "__new__",
      name: "",
      category: null,
      aliases: [],
      excluded_words: [],
      primary_keywords: [],
      secondary_keywords: [],
      soft_skills: [],
      last_trained_at: null,
      training_count: 0,
      parent_theme_id: parentThemeId || null,
      is_theme: !parentThemeId,
      profession_status: "active",
    };
    setNewProfName("");
    openThemeEditor(skeleton, parentThemeId, !parentThemeId);
    setCreatingNew(true);
  };

  const addToList = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };

  const removeFromList = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const saveTheme = async () => {
    if (!editingProfession) return;
    setSaving(true);
    try {
      const payload: any = {
        category: editCategory || null,
        aliases: editAliases,
        primary_keywords: editPrimary,
        secondary_keywords: editSecondary,
        soft_skills: editSoftSkills,
        excluded_words: editExcluded,
        parent_theme_id: editParentThemeId || null,
        is_theme: editIsTheme,
      };

      if (creatingNew) {
        const nameToUse = newProfName.trim() || editingProfession.name;
        if (!nameToUse) { toast.error("Entrez un nom"); setSaving(false); return; }
        const { error } = await supabase.from("ats_professions").insert({ ...payload, name: nameToUse, profession_status: 'active' });
        if (error) throw error;
        toast.success(`${editIsTheme ? "Thématique" : "Métier"} créé(e) !`);
        setCreatingNew(false);
      } else {
        const { error } = await supabase.from("ats_professions").update(payload).eq("id", editingProfession.id);
        if (error) throw error;
        toast.success(`${editIsTheme ? "Thématique" : "Métier"} sauvegardé(e) !`);
      }

      loadProfessions();
      setEditingProfession(null);
      setTab("thematiques");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== FILE IMPORT =====
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProfession) return;
    setImporting(true);
    setSuggestedKeywords([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data: { session } } = await supabase.auth.getSession();
      const parseRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-cv-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name, fileType: file.type }),
      });

      if (!parseRes.ok) throw new Error("Erreur extraction texte");
      const parseResult = await parseRes.json();
      if (!parseResult.success) throw new Error(parseResult.error || "Extraction échouée");

      const aiRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ats-ai-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          mode: "extract_keywords",
          text: parseResult.text,
          profession_name: editingProfession.name,
          existing_primary: editPrimary,
          existing_secondary: editSecondary,
          existing_soft_skills: editSoftSkills,
        }),
      });

      if (!aiRes.ok) throw new Error("Erreur IA extraction");
      const aiResult = await aiRes.json();

      if (aiResult.keywords) {
        setSuggestedKeywords(aiResult.keywords.map((k: any) => ({ keyword: k.keyword, category: k.category, accepted: null })));
        toast.success(`${aiResult.keywords.length} mots-clés détectés`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const acceptSuggestion = (index: number) => {
    const kw = suggestedKeywords[index];
    if (kw.category === "primary" && !editPrimary.includes(kw.keyword)) setEditPrimary([...editPrimary, kw.keyword]);
    else if (kw.category === "secondary" && !editSecondary.includes(kw.keyword)) setEditSecondary([...editSecondary, kw.keyword]);
    else if (kw.category === "soft_skill" && !editSoftSkills.includes(kw.keyword)) setEditSoftSkills([...editSoftSkills, kw.keyword]);
    const updated = [...suggestedKeywords];
    updated[index] = { ...kw, accepted: true };
    setSuggestedKeywords(updated);
  };

  const rejectSuggestion = (index: number) => {
    const updated = [...suggestedKeywords];
    updated[index] = { ...updated[index], accepted: false };
    setSuggestedKeywords(updated);
  };

  const acceptAllSuggestions = () => {
    const newPri = [...editPrimary];
    const newSec = [...editSecondary];
    const newSoft = [...editSoftSkills];
    const updated = suggestedKeywords.map(kw => {
      if (kw.accepted !== null) return kw;
      if (kw.category === "primary" && !newPri.includes(kw.keyword)) newPri.push(kw.keyword);
      else if (kw.category === "secondary" && !newSec.includes(kw.keyword)) newSec.push(kw.keyword);
      else if (kw.category === "soft_skill" && !newSoft.includes(kw.keyword)) newSoft.push(kw.keyword);
      return { ...kw, accepted: true };
    });
    setEditPrimary(newPri);
    setEditSecondary(newSec);
    setEditSoftSkills(newSoft);
    setSuggestedKeywords(updated);
    toast.success("Tous les mots-clés acceptés");
  };

  // ===== AI PROFESSION SUGGESTION =====
  const runAiProfessionSuggestion = async (analysis: CvAnalysis) => {
    setAiSuggesting(true);
    setProfSuggestion(null);
    setEditSuggestion(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ats-ai-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          mode: "suggest_profession",
          job_title: analysis.job_title,
          job_description: analysis.analysis_result?.jobDescription || analysis.job_title,
          existing_themes: themes.map(t => ({ name: t.name, category: t.category })),
        }),
      });
      if (!res.ok) throw new Error("Erreur IA");
      const result = await res.json();
      if (result.suggestion) {
        setProfSuggestion(result.suggestion);
        setEditSuggestion({ ...result.suggestion });
        toast.success("Suggestion IA générée !");
      }
    } catch (err: any) {
      toast.error("Erreur suggestion IA: " + err.message);
    } finally {
      setAiSuggesting(false);
    }
  };

  const createProfessionFromSuggestion = async () => {
    if (!editSuggestion) return;
    setCreatingFromSuggestion(true);
    try {
      // Find or create parent theme
      let parentThemeId: string | null = null;
      if (!editSuggestion.is_new_theme) {
        const matchedTheme = themes.find(t => t.name.toLowerCase() === editSuggestion.suggested_theme_name.toLowerCase());
        parentThemeId = matchedTheme?.id || null;
      } else {
        // Create new theme
        const { data: newTheme, error: themeErr } = await supabase.from("ats_professions").insert({
          name: editSuggestion.suggested_theme_name,
          is_theme: true,
          profession_status: "active",
          primary_keywords: [],
          secondary_keywords: [],
          soft_skills: [],
        }).select().single();
        if (themeErr) throw themeErr;
        parentThemeId = newTheme.id;
      }

      // Create the job profession as pending_review
      const { error } = await supabase.from("ats_professions").insert({
        name: editSuggestion.suggested_job_name,
        is_theme: false,
        parent_theme_id: parentThemeId,
        profession_status: "pending_review",
        primary_keywords: editSuggestion.primary_keywords,
        secondary_keywords: editSuggestion.secondary_keywords,
        soft_skills: editSuggestion.soft_skills,
        aliases: editSuggestion.aliases,
      });
      if (error) throw error;

      toast.success(`Métier "${editSuggestion.suggested_job_name}" créé en attente de validation`);
      setProfSuggestion(null);
      setEditSuggestion(null);
      loadProfessions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingFromSuggestion(false);
    }
  };

  const validatePendingProfession = async (profId: string) => {
    await supabase.from("ats_professions").update({ profession_status: "active" }).eq("id", profId);
    toast.success("Métier validé et activé !");
    loadProfessions();
  };

  const rejectPendingProfession = async (profId: string) => {
    await supabase.from("ats_professions").delete().eq("id", profId);
    toast.success("Métier rejeté et supprimé.");
    loadProfessions();
  };

  // ===== ANALYSIS REVIEW =====
  const openReview = (analysis: CvAnalysis) => {
    setSelectedAnalysis(analysis);
    setFeedbacks(new Map());
    setAdminNotes("");
    setProfSuggestion(null);
    setEditSuggestion(null);
    setTab("review");
  };

  const toggleKeywordFeedback = (keyword: string, originalCategory: string, action: "valid" | "invalid" | string) => {
    const newFeedbacks = new Map(feedbacks);
    if (action === "valid") {
      newFeedbacks.set(keyword, { keyword, original_category: originalCategory, corrected_category: originalCategory, is_valid: true, admin_notes: "", source: "manual" });
    } else if (action === "invalid") {
      newFeedbacks.set(keyword, { keyword, original_category: originalCategory, corrected_category: "excluded", is_valid: false, admin_notes: "", source: "manual" });
    } else {
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
      const newPrimaryKw = [...prof.primary_keywords];
      const newSecondaryKw = [...prof.secondary_keywords];
      const newSoftSkillsKw = [...prof.soft_skills];
      const feedbackInserts: any[] = [];

      for (const [, fb] of feedbacks) {
        feedbackInserts.push({
          profession_id: profId, keyword: fb.keyword, original_category: fb.original_category,
          corrected_category: fb.corrected_category, is_valid: fb.is_valid, admin_notes: fb.admin_notes || adminNotes, source: fb.source,
        });
        if (!fb.is_valid || fb.corrected_category === "common_word") {
          if (!newExcluded.includes(fb.keyword)) newExcluded.push(fb.keyword);
          [newPrimaryKw, newSecondaryKw, newSoftSkillsKw].forEach(arr => { const idx = arr.indexOf(fb.keyword); if (idx > -1) arr.splice(idx, 1); });
        } else if (fb.corrected_category !== fb.original_category) {
          [newPrimaryKw, newSecondaryKw, newSoftSkillsKw].forEach(arr => { const idx = arr.indexOf(fb.keyword); if (idx > -1) arr.splice(idx, 1); });
          if (fb.corrected_category === "primary") newPrimaryKw.push(fb.keyword);
          else if (fb.corrected_category === "secondary") newSecondaryKw.push(fb.keyword);
          else if (fb.corrected_category === "soft_skill") newSoftSkillsKw.push(fb.keyword);
          else if (fb.corrected_category === "excluded") { if (!newExcluded.includes(fb.keyword)) newExcluded.push(fb.keyword); }
        }
      }

      await supabase.from("ats_keyword_feedback").insert(feedbackInserts);
      await supabase.from("ats_professions").update({
        excluded_words: newExcluded, primary_keywords: newPrimaryKw, secondary_keywords: newSecondaryKw, soft_skills: newSoftSkillsKw,
        last_trained_at: new Date().toISOString(), training_count: (prof.training_count || 0) + feedbacks.size,
      }).eq("id", profId);
      await supabase.from("cv_analyses").update({
        admin_reviewed: true, admin_feedback: { notes: adminNotes, corrections_count: feedbacks.size },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ analysis: selectedAnalysis }),
      });
      if (!res.ok) throw new Error("Erreur IA");
      const result = await res.json();
      if (result.suggestions) {
        const newFeedbacks = new Map(feedbacks);
        for (const s of result.suggestions) {
          newFeedbacks.set(s.keyword, { keyword: s.keyword, original_category: s.original_category, corrected_category: s.corrected_category, is_valid: s.is_valid, admin_notes: s.reason || "", source: "ai" });
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

  const runBulkAiReview = async () => {
    const { data: unreviewed } = await supabase
      .from("cv_analyses").select("*").eq("admin_reviewed", false).not("profession_id", "is", null)
      .order("created_at", { ascending: false }).limit(50);

    if (!unreviewed || unreviewed.length === 0) {
      toast.info("Aucune analyse non revue avec une thématique identifiée.");
      return;
    }

    setBulkReviewing(true);
    setBulkProgress({ current: 0, total: unreviewed.length, done: false });

    const { data: { session } } = await supabase.auth.getSession();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < unreviewed.length; i++) {
      const analysis = unreviewed[i] as CvAnalysis;
      setBulkProgress(p => ({ ...p, current: i + 1 }));
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ats-ai-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ analysis }),
        });
        if (!res.ok) throw new Error("Erreur IA");
        const result = await res.json();
        if (!result.suggestions || result.suggestions.length === 0) {
          await supabase.from("cv_analyses").update({ admin_reviewed: true, admin_feedback: { notes: "Revue IA auto — aucune correction", corrections_count: 0 } }).eq("id", analysis.id);
          successCount++;
          continue;
        }

        const profId = analysis.profession_id!;
        const prof = professions.find(p => p.id === profId);
        if (!prof) { errorCount++; continue; }

        const newExcluded = [...prof.excluded_words];
        const newPrimaryKw = [...prof.primary_keywords];
        const newSecondaryKw = [...prof.secondary_keywords];
        const newSoftSkillsKw = [...prof.soft_skills];
        const feedbackInserts: any[] = [];

        for (const s of result.suggestions) {
          feedbackInserts.push({
            profession_id: profId, keyword: s.keyword, original_category: s.original_category,
            corrected_category: s.corrected_category, is_valid: s.is_valid, admin_notes: s.reason || "Revue IA auto", source: "ai_bulk",
          });
          if (!s.is_valid || s.corrected_category === "common_word" || s.corrected_category === "excluded") {
            if (!newExcluded.includes(s.keyword)) newExcluded.push(s.keyword);
            [newPrimaryKw, newSecondaryKw, newSoftSkillsKw].forEach(arr => { const idx = arr.indexOf(s.keyword); if (idx > -1) arr.splice(idx, 1); });
          } else if (s.corrected_category !== s.original_category) {
            [newPrimaryKw, newSecondaryKw, newSoftSkillsKw].forEach(arr => { const idx = arr.indexOf(s.keyword); if (idx > -1) arr.splice(idx, 1); });
            if (s.corrected_category === "primary") newPrimaryKw.push(s.keyword);
            else if (s.corrected_category === "secondary") newSecondaryKw.push(s.keyword);
            else if (s.corrected_category === "soft_skill") newSoftSkillsKw.push(s.keyword);
          }
        }

        if (feedbackInserts.length > 0) await supabase.from("ats_keyword_feedback").insert(feedbackInserts);
        await supabase.from("ats_professions").update({
          excluded_words: newExcluded, primary_keywords: newPrimaryKw, secondary_keywords: newSecondaryKw, soft_skills: newSoftSkillsKw,
          last_trained_at: new Date().toISOString(), training_count: (prof.training_count || 0) + result.suggestions.length,
        }).eq("id", profId);
        await supabase.from("cv_analyses").update({
          admin_reviewed: true, admin_feedback: { notes: "Revue IA automatique", corrections_count: result.suggestions.length },
        }).eq("id", analysis.id);

        const updatedProf = { ...prof, excluded_words: newExcluded, primary_keywords: newPrimaryKw, secondary_keywords: newSecondaryKw, soft_skills: newSoftSkillsKw, training_count: (prof.training_count || 0) + result.suggestions.length };
        setProfessions(prev => prev.map(p => p.id === profId ? updatedProf : p));
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkProgress(p => ({ ...p, done: true }));
    setBulkReviewing(false);
    toast.success(`Revue IA terminée : ${successCount} analyses traitées${errorCount > 0 ? `, ${errorCount} erreurs` : ""}`);
    loadProfessions();
    loadAnalyses();
  };

  const getAnalysisKeywords = (analysis: CvAnalysis) => {
    const result = analysis.analysis_result;
    const keywords: Array<{ keyword: string; category: string; found: boolean }> = [];
    if (result?.primaryKeywords?.scores) for (const s of result.primaryKeywords.scores) keywords.push({ keyword: s.keyword, category: "primary", found: s.cvCount > 0 });
    if (result?.secondaryKeywords?.scores) for (const s of result.secondaryKeywords.scores) keywords.push({ keyword: s.keyword, category: "secondary", found: s.cvCount > 0 });
    if (result?.softSkills?.scores) for (const s of result.softSkills.scores) keywords.push({ keyword: s.skill, category: "soft_skill", found: s.found });
    return keywords;
  };

  const categoryColor = (cat: string) => {
    if (cat === "primary") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (cat === "secondary") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (cat === "soft_skill") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (cat === "common_word" || cat === "excluded") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-muted text-muted-foreground";
  };

  const categoryRowBg = (cat: string) => {
    if (cat === "primary") return "bg-blue-500/5 border-l-2 border-l-blue-500/40";
    if (cat === "secondary") return "bg-purple-500/5 border-l-2 border-l-purple-500/40";
    if (cat === "soft_skill") return "bg-green-500/5 border-l-2 border-l-green-500/40";
    if (cat === "common_word" || cat === "excluded") return "bg-red-500/5 border-l-2 border-l-red-500/40";
    return "bg-muted/20";
  };

  const categoryLabel = (cat: string) => {
    if (cat === "primary") return "🔵 Hard Skill";
    if (cat === "secondary") return "🟣 Secondaire";
    if (cat === "soft_skill") return "🟢 Soft Skill";
    if (cat === "common_word") return "🔴 Mot courant";
    if (cat === "excluded") return "🔴 Mot exclu";
    return cat;
  };

  // ===== RENDER HELPERS =====
  const renderKeywordList = (
    label: string, color: string, items: string[], setItems: (v: string[]) => void,
    inputValue: string, setInputValue: (v: string) => void,
    readOnly = false, inheritedItems?: string[]
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label} ({items.length})</label>

      {/* Inherited keywords from parent theme (read-only) */}
      {inheritedItems && inheritedItems.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Hérités de la thématique parente (lecture seule)</span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/30 border border-border/30">
            {inheritedItems.map((item, i) => (
              <Badge key={i} className={`${color} opacity-50 text-xs`}>{item}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Specific keywords */}
      {inheritedItems && inheritedItems.length > 0 && (
        <span className="text-xs text-foreground font-medium">Mots-clés spécifiques à ce métier</span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} className={`${color} pr-1 flex items-center gap-1`}>
            {item}
            {!readOnly && <button onClick={() => removeFromList(items, setItems, i)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>}
          </Badge>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ajouter un ${label.toLowerCase().replace(/\s*\(\d+\)/, '')}...`}
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(items, setItems, inputValue, setInputValue); } }}
          />
          <Button size="sm" variant="outline" className="h-8" onClick={() => addToList(items, setItems, inputValue, setInputValue)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ATS Training</h1>
          <p className="text-muted-foreground text-sm">Machine Learning itératif — hiérarchie Thématiques → Métiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{themes.length} thématiques</Badge>
          <Badge variant="outline" className="text-xs">{professions.filter(p => !p.is_theme).length} métiers</Badge>
          {pendingReview.length > 0 && (
            <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
              {pendingReview.length} à valider
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">{analyses.filter(a => !a.admin_reviewed).length} analyses à revoir</Badge>
          <Button
            variant="outline" size="sm"
            onClick={runBulkAiReview}
            disabled={bulkReviewing || analyses.filter(a => !a.admin_reviewed).length === 0}
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            {bulkReviewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            {bulkReviewing ? `Revue en cours... (${bulkProgress.current}/${bulkProgress.total})` : `Revue IA en masse (${analyses.filter(a => !a.admin_reviewed).length})`}
          </Button>
        </div>
      </div>

      {/* Bulk review progress */}
      {bulkReviewing && (
        <Card className="bg-card border-primary/30">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                Revue IA automatique en cours...
              </span>
              <span className="text-muted-foreground">{bulkProgress.current} / {bulkProgress.total} analyses</span>
            </div>
            <Progress value={bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="thematiques">Thématiques & Métiers</TabsTrigger>
          <TabsTrigger value="analyses">Analyses à revoir</TabsTrigger>
          {selectedAnalysis && <TabsTrigger value="review">Revue</TabsTrigger>}
          {editingProfession && <TabsTrigger value="edit-theme">
            {creatingNew ? "Nouveau" : "Édition"}: {newProfName || editingProfession.name || "…"}
          </TabsTrigger>}
        </TabsList>

        {/* ===== TAB: THEMATIQUES ===== */}
        <TabsContent value="thematiques">
          <div className="space-y-6">
            {/* Pending Review Section */}
            {pendingReview.length > 0 && (
              <Card className="bg-card border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-400" />
                    🤖 Nouveaux métiers proposés par l'IA — à valider ({pendingReview.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingReview.map(p => {
                    const parentName = p.parent_theme_id ? professions.find(t => t.id === p.parent_theme_id)?.name : null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {parentName ? `📂 ${parentName}` : "Sans thématique"}
                            {" · "}{p.primary_keywords.length} hard skills · {p.soft_skills.length} soft skills
                          </div>
                          {p.primary_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.primary_keywords.slice(0, 5).map((kw, i) => (
                                <Badge key={i} className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">{kw}</Badge>
                              ))}
                              {p.primary_keywords.length > 5 && <span className="text-xs text-muted-foreground">+{p.primary_keywords.length - 5}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openThemeEditor(p)}>
                            Modifier
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => validatePendingProfession(p.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Valider
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => rejectPendingProfession(p.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> Rejeter
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* New Theme Button */}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => openNewProfessionForm(undefined)} className="border-primary/50 text-primary hover:bg-primary/10">
                <Plus className="h-4 w-4 mr-1" /> Nouvelle thématique
              </Button>
            </div>

            {/* Themes Accordion */}
            <Accordion type="multiple" className="space-y-2">
              {themes.map(theme => {
                const children = getChildJobs(theme.id);
                const pendingChildren = children.filter(c => c.profession_status === 'pending_review');
                const activeChildren = children.filter(c => c.profession_status === 'active');
                const analysisCount = analyses.filter(a => a.profession_id === theme.id || children.some(c => c.id === a.profession_id)).length;

                return (
                  <AccordionItem key={theme.id} value={theme.id} className="border border-border/50 rounded-lg bg-card overflow-hidden">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {theme.name}
                            {theme.category && <Badge variant="outline" className="text-xs">{theme.category}</Badge>}
                            {pendingChildren.length > 0 && (
                              <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                                {pendingChildren.length} 🆕
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activeChildren.length} métier{activeChildren.length !== 1 ? 's' : ''} · {theme.primary_keywords.length} mots-clés communs · {analysisCount} analyses
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4 pt-1 space-y-3">
                        {/* Theme keywords summary */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                          <span className="font-medium text-foreground">Base commune:</span>
                          {theme.primary_keywords.slice(0, 6).map((kw, i) => (
                            <Badge key={i} className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">{kw}</Badge>
                          ))}
                          {theme.primary_keywords.length > 6 && <span>+{theme.primary_keywords.length - 6} autres</span>}
                          <Button size="sm" variant="ghost" className="h-6 ml-auto text-xs" onClick={() => openThemeEditor(theme)}>
                            Éditer thématique
                          </Button>
                        </div>

                        {/* Child jobs */}
                        {children.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Aucun métier spécifique — ajouter des métiers pour plus de précision.</p>
                        )}
                        <div className="space-y-2">
                          {children.map(job => (
                            <div
                              key={job.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors hover:border-primary/50 ${
                                job.profession_status === 'pending_review'
                                  ? 'bg-orange-500/5 border-orange-500/30'
                                  : 'bg-muted/20 border-border/30'
                              }`}
                              onClick={() => openThemeEditor(job)}
                            >
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {job.name}
                                  {job.profession_status === 'pending_review' && (
                                    <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">🆕 À valider</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {job.primary_keywords.length} hard skills propres · {job.soft_skills.length} soft skills · {job.training_count || 0} feedbacks
                                </div>
                                {job.aliases.length > 0 && (
                                  <div className="text-xs text-muted-foreground">Alias: {job.aliases.join(", ")}</div>
                                )}
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </div>
                          ))}
                        </div>

                        {/* Add job button */}
                        <Button
                          size="sm" variant="outline"
                          className="w-full h-7 text-xs border-dashed border-primary/30 text-primary/70 hover:bg-primary/5"
                          onClick={() => openNewProfessionForm(theme.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Ajouter un métier dans "{theme.name}"
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Orphan jobs (jobs without a theme) */}
            {orphanJobs.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Métiers sans thématique parente ({orphanJobs.length})</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {orphanJobs.map(prof => (
                    <div key={prof.id} className="p-3 rounded border border-border/30 bg-muted/20 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openThemeEditor(prof)}>
                      <div className="font-medium text-sm">{prof.name}</div>
                      <div className="text-xs text-muted-foreground">{prof.primary_keywords.length} keywords · {prof.training_count || 0} feedbacks</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== TAB: EDIT THEME ===== */}
        <TabsContent value="edit-theme">
          {editingProfession && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setEditingProfession(null); setCreatingNew(false); setTab("thematiques"); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {editIsTheme ? <FolderOpen className="h-4 w-4 text-primary" /> : <Briefcase className="h-4 w-4 text-muted-foreground" />}
                    {creatingNew ? (
                      <Input
                        value={newProfName}
                        onChange={(e) => setNewProfName(e.target.value)}
                        placeholder={editIsTheme ? "Nom de la thématique..." : "Nom du métier..."}
                        className="h-8 text-base font-semibold w-64"
                        autoFocus
                      />
                    ) : editingProfession.name}
                    {editIsTheme ? (
                      <Badge variant="outline" className="text-xs">Thématique</Badge>
                    ) : (
                      <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">Métier spécifique</Badge>
                    )}
                  </h3>
                  {!editIsTheme && editParentThemeId && (
                    <p className="text-xs text-muted-foreground">
                      📂 Thématique parente: <strong>{professions.find(p => p.id === editParentThemeId)?.name || editParentThemeId}</strong>
                    </p>
                  )}
                  {!creatingNew && (
                    <p className="text-xs text-muted-foreground">Édition des mots-clés et paramètres</p>
                  )}
                </div>
              </div>

              {/* Type switcher — only when creating new */}
              {creatingNew && (
                <Card className="bg-card border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <Button
                        size="sm" variant={editIsTheme ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => { setEditIsTheme(true); setEditParentThemeId(""); }}
                      >
                        <FolderOpen className="h-4 w-4 mr-1" /> Thématique (ex: Gestion de projet)
                      </Button>
                      <Button
                        size="sm" variant={!editIsTheme ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setEditIsTheme(false)}
                      >
                        <Briefcase className="h-4 w-4 mr-1" /> Métier spécifique (ex: Scrum Master)
                      </Button>
                    </div>
                    {!editIsTheme && (
                      <div className="mt-3 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Thématique parente</label>
                        <Select value={editParentThemeId} onValueChange={setEditParentThemeId}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir une thématique..." /></SelectTrigger>
                          <SelectContent>
                            {themes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Parent theme: if editing a child job, show which theme it belongs to */}
              {!editIsTheme && !creatingNew && (
                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="pt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Thématique parente</label>
                      <Select value={editParentThemeId} onValueChange={setEditParentThemeId}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucune thématique parente..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucune</SelectItem>
                          {themes.filter(t => t.id !== editingProfession.id).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category & Aliases */}
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Paramètres généraux</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {editIsTheme && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Catégorie</label>
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {renderKeywordList("Aliases / Intitulés équivalents", "bg-muted text-muted-foreground", editAliases, setEditAliases, newAlias, setNewAlias)}
                </CardContent>
              </Card>

              {/* Keywords — with parent theme inherited keywords shown for child jobs */}
              {(() => {
                const parent = editParentThemeId ? professions.find(p => p.id === editParentThemeId) : null;
                return (
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {editIsTheme ? "Mots-clés communs à tous les métiers de cette thématique" : "Mots-clés spécifiques à ce métier"}
                        </CardTitle>
                        <div className="flex gap-2">
                          <input type="file" ref={fileInputRef} accept=".pdf,.txt,.docx" className="hidden" onChange={handleFileImport} />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                            {importing ? "Extraction..." : "Importer via fichier"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-blue-500/20">
                          <span className="text-base">🔵</span>
                          <span className="text-sm font-semibold text-blue-400">Hard Skills — Compétences techniques principales</span>
                          <span className="text-xs text-muted-foreground ml-auto">Outils, logiciels, technologies, certifications</span>
                        </div>
                        {renderKeywordList("Hard Skill", "bg-blue-500/20 text-blue-400 border-blue-500/30", editPrimary, setEditPrimary, newPrimary, setNewPrimary, false, parent?.primary_keywords)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-purple-500/20">
                          <span className="text-base">🟣</span>
                          <span className="text-sm font-semibold text-purple-400">Mots-clés secondaires</span>
                          <span className="text-xs text-muted-foreground ml-auto">Connaissances associées au métier</span>
                        </div>
                        {renderKeywordList("Mot-clé secondaire", "bg-purple-500/20 text-purple-400 border-purple-500/30", editSecondary, setEditSecondary, newSecondary, setNewSecondary, false, parent?.secondary_keywords)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-green-500/20">
                          <span className="text-base">🟢</span>
                          <span className="text-sm font-semibold text-green-400">Soft Skills — Savoir-être</span>
                          <span className="text-xs text-muted-foreground ml-auto">Qualités comportementales</span>
                        </div>
                        {renderKeywordList("Soft skill", "bg-green-500/20 text-green-400 border-green-500/30", editSoftSkills, setEditSoftSkills, newSoftSkill, setNewSoftSkill, false, parent?.soft_skills)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-red-500/20">
                          <span className="text-base">🔴</span>
                          <span className="text-sm font-semibold text-red-400">Mots exclus</span>
                          <span className="text-xs text-muted-foreground ml-auto">Mots génériques sans valeur</span>
                        </div>
                        {renderKeywordList("Mot exclu", "bg-red-500/20 text-red-400 border-red-500/30", editExcluded, setEditExcluded, newExcluded, setNewExcluded)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* AI Suggested Keywords from file import */}
              {suggestedKeywords.length > 0 && (
                <Card className="bg-card border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Mots-clés extraits ({suggestedKeywords.filter(k => k.accepted === null).length} en attente)
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={acceptAllSuggestions}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Tout accepter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {suggestedKeywords.map((kw, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded ${kw.accepted === true ? "bg-green-500/10" : kw.accepted === false ? "bg-red-500/10 opacity-50" : "bg-muted/50"}`}>
                        <Badge className={categoryColor(kw.category)}>{kw.keyword}</Badge>
                        <span className="text-xs text-muted-foreground">→ {kw.category}</span>
                        {kw.accepted === null && (
                          <div className="flex gap-1 ml-auto">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => acceptSuggestion(i)}>
                              <CheckCircle className="h-3 w-3 text-green-400" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => rejectSuggestion(i)}>
                              <XCircle className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        )}
                        {kw.accepted === true && <span className="ml-auto text-xs text-green-400">✓ Ajouté</span>}
                        {kw.accepted === false && <span className="ml-auto text-xs text-red-400">✗ Ignoré</span>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={saveTheme} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {creatingNew ? "Créer" : "Sauvegarder les modifications"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== TAB: ANALYSES ===== */}
        <TabsContent value="analyses">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={filterReviewed} onValueChange={setFilterReviewed}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreviewed">Non revues</SelectItem>
                  <SelectItem value="reviewed">Déjà revues</SelectItem>
                  <SelectItem value="all">Toutes</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadAnalyses} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
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
                      {a.needs_profession_suggestion && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">🤖 Métier inconnu</Badge>
                      )}
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
                    {selectedAnalysis.analysis_result?.profession?.parentThemeName && (
                      <span className="ml-2">· 📂 {selectedAnalysis.analysis_result.profession.parentThemeName}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* AI Profession Suggestion — shown when no profession identified */}
              {selectedAnalysis.needs_profession_suggestion && (
                <Card className="bg-card border-purple-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      🤖 Métier non identifié — Suggestion IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!profSuggestion && (
                      <Button
                        variant="outline" size="sm"
                        onClick={() => runAiProfessionSuggestion(selectedAnalysis)}
                        disabled={aiSuggesting}
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        {aiSuggesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        {aiSuggesting ? "Analyse en cours..." : "🤖 Suggérer un métier par IA"}
                      </Button>
                    )}

                    {editSuggestion && (
                      <div className="space-y-4 mt-2">
                        <div className="p-3 rounded bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                          🤖 {profSuggestion?.reasoning} <span className="ml-2 opacity-60">Confiance: {Math.round((profSuggestion?.confidence || 0) * 100)}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Nom du métier</label>
                            <Input value={editSuggestion.suggested_job_name} onChange={e => setEditSuggestion({ ...editSuggestion, suggested_job_name: e.target.value })} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Thématique parente</label>
                            {editSuggestion.is_new_theme ? (
                              <Input value={editSuggestion.suggested_theme_name} onChange={e => setEditSuggestion({ ...editSuggestion, suggested_theme_name: e.target.value })} className="h-8 text-sm" placeholder="Nouvelle thématique..." />
                            ) : (
                              <Select value={editSuggestion.suggested_theme_name} onValueChange={v => setEditSuggestion({ ...editSuggestion, suggested_theme_name: v })}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {themes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Hard skills spécifiques détectés</label>
                          <div className="flex flex-wrap gap-1">
                            {editSuggestion.primary_keywords.map((kw, i) => (
                              <Badge key={i} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={createProfessionFromSuggestion} disabled={creatingFromSuggestion} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {creatingFromSuggestion ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Créer ce métier (pending review)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setProfSuggestion(null); setEditSuggestion(null); }}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
                <CardContent className="space-y-2 p-3">
                  {getAnalysisKeywords(selectedAnalysis).map(kw => {
                    const fb = feedbacks.get(kw.keyword);
                    const displayCat = fb?.corrected_category || kw.category;
                    return (
                      <div key={kw.keyword} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${categoryRowBg(displayCat)}`}>
                        <Badge className={`shrink-0 min-w-[80px] justify-center ${categoryColor(displayCat)}`}>{kw.keyword}</Badge>
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{categoryLabel(displayCat)} · {kw.found ? "✓ trouvé" : "✗ absent"}</span>
                        {fb?.source === "ai" && fb.admin_notes && (
                          <span className="text-xs text-primary truncate flex-1">🤖 {fb.admin_notes}</span>
                        )}
                        <div className="flex gap-1 ml-auto shrink-0 items-center">
                          <Button size="sm" variant={fb?.is_valid === true ? "default" : "outline"} className="h-6 w-6 p-0" title="Valide" onClick={() => toggleKeywordFeedback(kw.keyword, kw.category, "valid")}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant={fb?.is_valid === false ? "destructive" : "outline"} className="h-6 w-6 p-0" title="Invalide" onClick={() => toggleKeywordFeedback(kw.keyword, kw.category, "invalid")}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                          <Select onValueChange={(val) => toggleKeywordFeedback(kw.keyword, kw.category, val)}>
                            <SelectTrigger className="h-6 w-28 text-xs"><SelectValue placeholder="Reclasser" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">🔵 Hard Skill</SelectItem>
                              <SelectItem value="secondary">🟣 Secondaire</SelectItem>
                              <SelectItem value="soft_skill">🟢 Soft Skill</SelectItem>
                              <SelectItem value="excluded">🔴 Mot exclu</SelectItem>
                              <SelectItem value="common_word">🔴 Mot courant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-4 space-y-3">
                  <Textarea placeholder="Remarques générales sur cette analyse..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{feedbacks.size} correction(s) en attente</span>
                    <Button onClick={applyCorrections} disabled={loading || feedbacks.size === 0}>
                      <Brain className="h-4 w-4 mr-1" /> Appliquer les corrections
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
