import React, { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle, Target, Brain, Heart, Briefcase, FileCheck, RotateCcw, Zap, X, Check, ListChecks, Lightbulb, Hash, Wrench, Users } from "lucide-react";

interface AnalysisResult {
  totalScore: number;
  extractionWarning: boolean;
  contactInfo: {
    email: boolean;
    phone: boolean;
    address: boolean;
    web: boolean;
    score: number;
    maxScore: number;
  };
  profileSection: {
    found: boolean;
    score: number;
    maxScore: number;
  };
  sections: {
    checks: Array<{ section: string; found: boolean; points: number }>;
    score: number;
    maxScore: number;
  };
  profession: {
    name: string;
    isPartialMatch: boolean;
    confidence: number;
  };
  primaryKeywords: {
    scores: Array<{ keyword: string; cvCount: number; jobCount: number; points: number; maxPoints: number }>;
    total: number;
    maxTotal: number;
    bonusKeywords: Array<{ keyword: string; bonus: number }>;
    bonus: number;
  };
  secondaryKeywords: {
    scores: Array<{ keyword: string; cvCount: number; jobCount: number; points: number; maxPoints: number }>;
    total: number;
    maxTotal: number;
    bonusKeywords: Array<{ keyword: string; bonus: number }>;
    bonus: number;
  };
  softSkills: {
    scores: Array<{ skill: string; found: boolean; points: number }>;
    total: number;
    maxTotal: number;
  };
  measurableResults: {
    count: number;
    score: number;
    maxScore: number;
    examples: string[];
  };
  wordCount: {
    count: number;
    score: number;
    maxScore: number;
  };
  images: {
    count: number;
    penalty: number;
  };
  proximity: {
    bonus: number;
    maxBonus: number;
    details: Array<{ primary: string; secondary: string }>;
  };
  titleCheck: {
    filteredTitle: string;
    found: boolean;
    score: number;
  };
  contractType: {
    found: string;
    score: number;
  };
}

const getScoreColor = (score: number) => {
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
};

const getScoreStrokeClass = (score: number) => {
  if (score > 70) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
};

const getScoreLabel = (score: number) => {
  if (score > 70) return "Excellent match";
  if (score >= 40) return "Bonne compatibilité";
  return "À améliorer";
};

const getScoreTextClass = (score: number) => {
  if (score > 70) return "text-green-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
};

const getSubScoreLabel = (total: number, max: number) => {
  if (max === 0) return "N/A";
  const pct = (total / max) * 100;
  if (pct >= 75) return "Excellent";
  if (pct >= 50) return "Moyen";
  return "Faible";
};

const getSubScoreBadgeClass = (total: number, max: number) => {
  if (max === 0) return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  const pct = (total / max) * 100;
  if (pct >= 75) return "bg-green-500/10 text-green-400 border-green-500/20";
  if (pct >= 50) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
};

export const CVComparator = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const allowedExts = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("Format non supporté. Utilisez PDF, DOCX ou TXT.");
      return;
    }

    setCvFile(file);
    setIsParsing(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await supabase.functions.invoke('parse-cv-document', {
        body: { fileBase64: base64, fileName: file.name, fileType: file.type },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Parsing failed');

      setCvText(response.data.text);
      toast.success(`CV "${file.name}" importé avec succès`);
    } catch (error) {
      console.error('Error parsing CV:', error);
      toast.error("Erreur lors de l'import du CV");
      setCvFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!cvText.trim()) {
      toast.error("Veuillez importer un CV");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Veuillez coller la fiche de poste");
      return;
    }
    if (!jobTitle.trim()) {
      toast.error("Veuillez saisir l'intitulé du poste");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke('analyze-cv-ats', {
        body: { cvText, jobDescription, jobTitle },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setResult(response.data);
      toast.success("Analyse terminée !");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCvText("");
    setCvFile(null);
    setJobTitle("");
    setJobDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Score gauge calculations
  const score = result?.totalScore ?? 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  // Gather advice items
  const adviceItems: Array<{ title: string; text: string }> = [];
  if (result) {
    const missingPrimary = result.primaryKeywords.scores.filter(k => k.points === 0);
    const missingSecondary = result.secondaryKeywords.scores.filter(k => k.points === 0);
    const missingSoft = result.softSkills.scores.filter(s => !s.found);

    if (missingPrimary.length > 0) {
      adviceItems.push({
        title: "Intégrez les mots-clés manquants",
        text: `L'offre demande : ${missingPrimary.map(k => `"${k.keyword}"`).join(', ')}. Ajoutez-les dans vos expériences si pertinent.`
      });
    }
    if ((result.measurableResults?.count ?? 0) < 3) {
      adviceItems.push({
        title: "Quantifiez vos réalisations",
        text: 'Remplacez "Géré un projet" par "Géré un projet de 50k€ avec +30% de résultats". Les ATS valorisent les chiffres.'
      });
    }
    if (!result.titleCheck?.found) {
      adviceItems.push({
        title: "Adaptez le titre de votre CV",
        text: `Utilisez exactement "${jobTitle}" comme titre principal de votre document.`
      });
    }
    if (missingSoft.length > 0) {
      adviceItems.push({
        title: "Développez vos soft skills",
        text: `Mentionnez ${missingSoft.map(s => `"${s.skill}"`).join(', ')} à travers des exemples concrets dans vos expériences.`
      });
    }
    if (missingSecondary.length > 0) {
      adviceItems.push({
        title: "Renforcez les compétences transversales",
        text: `Intégrez ces termes : ${missingSecondary.map(k => `"${k.keyword}"`).join(', ')} dans vos descriptions.`
      });
    }
  }

  // Structure checks for the structure card
  const structureChecks = result ? [
    { label: "Coordonnées", ok: result.contactInfo?.email || result.contactInfo?.phone || result.contactInfo?.address },
    { label: "Structure Claire", ok: (result.sections?.checks ?? []).filter(s => s.found).length >= 3 },
    { label: "Longueur Idéale", ok: (result.wordCount?.count ?? 0) >= 400 && (result.wordCount?.count ?? 0) <= 1200 },
    { label: "KPIs/Chiffres", ok: (result.measurableResults?.count ?? 0) >= 3 },
  ] : [];

  const structureScore = result ? Math.round((structureChecks.filter(c => c.ok).length / structureChecks.length) * 100) : 0;

  const hardSkillPct = result && result.primaryKeywords.maxTotal > 0 
    ? Math.round((result.primaryKeywords.total / result.primaryKeywords.maxTotal) * 100) 
    : 0;
  const softSkillPct = result && result.softSkills.maxTotal > 0 
    ? Math.round((result.softSkills.total / result.softSkills.maxTotal) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">
            Score ATS de votre CV
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Analysez la compatibilité de votre CV avec l'offre d'emploi grâce à notre IA. Obtenez un score précis et des conseils pour optimiser votre candidature.
          </p>
        </div>
        {result && (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] text-gray-300 text-sm font-medium hover:text-white hover:bg-white/[0.05] flex items-center transition-all"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Nouvelle analyse
            </button>
          </div>
        )}
      </div>

      {/* ==================== STATE 1: INPUT FORM ==================== */}
      {!result && !isAnalyzing && (
        <div className="space-y-8">
          {/* Centered hero intro */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 mb-6 border border-white/[0.05] shadow-[0_0_20px_rgba(79,70,229,0.15)]">
              <Target className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Analysez votre compatibilité ATS</h2>
            <p className="text-gray-400 text-lg">Collez votre CV et l'offre d'emploi pour obtenir un score de compatibilité instantané et des conseils d'optimisation.</p>
          </div>

          {/* Two-column input cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: CV Input */}
            <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col border-t border-t-white/[0.1] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Votre CV</h3>
                    <p className="text-xs text-gray-500">Texte brut ou fichier PDF/DOCX</p>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Importer un fichier
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isParsing ? (
                <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center gap-3 bg-[#121215]/60 border border-white/[0.1] rounded-xl">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-sm text-gray-400">Extraction du texte en cours...</p>
                </div>
              ) : cvFile && cvText ? (
                <div className="flex-1 min-h-[300px] flex flex-col">
                  <div className="flex items-center gap-2 mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <FileCheck className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">{cvFile.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{cvText.length} caractères</span>
                  </div>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    className="w-full flex-1 bg-[#121215]/60 border border-white/[0.1] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none font-mono leading-relaxed focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              ) : (
                <div className="relative flex-1 min-h-[300px]">
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    className="w-full h-full bg-[#121215]/60 border border-white/[0.1] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none font-mono leading-relaxed focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder={`Copiez le contenu de votre CV ici...\n\nExemple:\nJean Dupont\nDéveloppeur Full Stack\nParis, France\n\nEXPÉRIENCE\nSenior Developer chez TechCorp...`}
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-[#121215]/80 px-2 py-1 rounded border border-white/[0.05]">
                    {cvText.length} caractères
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Job Offer Input */}
            <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col border-t border-t-white/[0.1] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Offre d'emploi</h3>
                    <p className="text-xs text-gray-500">Description du poste visé</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Intitulé du poste</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-[#121215]/60 border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Ex: Product Manager"
                />
              </div>

              <div className="relative flex-1 min-h-[220px]">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full h-full bg-[#121215]/60 border border-white/[0.1] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none font-mono leading-relaxed focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder={`Copiez la description de l'offre ici...\n\nExemple:\nNous recherchons un développeur passionné avec 5 ans d'expérience en React et Node.js...`}
                />
              </div>

              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Copiez l'offre complète pour une précision maximale
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={handleAnalyze}
              disabled={!cvText || !jobDescription || !jobTitle}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
            >
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-lg">Analyser mon CV</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== STATE 2: LOADING ==================== */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-10 flex flex-col items-center max-w-md w-full shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-10 w-10 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Analyse en cours...</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Notre IA scanne votre CV et le compare aux critères de l'offre.</p>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Extraction des mots-clés</span>
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Analyse de la structure</span>
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                <span>Calcul du score final...</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STATE 3: RESULTS ==================== */}
      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Extraction warning */}
          {result.extractionWarning && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <span className="text-sm text-amber-300">CV incomplet ou mal formaté — Analyse partielle. Importez un CV plus complet pour de meilleurs résultats.</span>
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Target className="h-5 w-5 text-indigo-500" />
              Résultats de l'analyse
            </h2>
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium">
              Analyse complétée
            </span>
          </div>

          {/* Top Row: Score Hero + Detail Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Score Hero Card */}
            <div className="lg:col-span-4 bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-green-500" />
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${getScoreColor(score)}20` }} />

              {/* Job badge */}
              {jobTitle && (
                <div className="mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    <Briefcase className="h-3 w-3 mr-2" />
                    {jobTitle}
                  </span>
                </div>
              )}

              {/* Circular Gauge */}
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-800 stroke-current"
                    strokeWidth={8}
                    cx={50}
                    cy={50}
                    r={40}
                    fill="transparent"
                  />
                  <circle
                    className={`${getScoreStrokeClass(score)} stroke-current transition-all duration-1000`}
                    strokeWidth={8}
                    strokeLinecap="round"
                    cx={50}
                    cy={50}
                    r={40}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                    style={{ filter: `drop-shadow(0 0 10px ${getScoreColor(score)}80)` }}
                  />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-white tracking-tighter">{Math.round(score)}</span>
                  <span className="text-sm text-gray-400 font-medium">/ 100</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{getScoreLabel(score)}</h3>
              <p className={`text-sm font-medium mb-6 ${getScoreTextClass(score)}`}>
                {result.profession?.name && `Métier détecté : ${result.profession.name}`}
              </p>

              {/* Mini stats row */}
              <div className="w-full grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div className="text-xs text-gray-500 mb-1">Hard Skills</div>
                  <div className="text-indigo-400 font-bold">{hardSkillPct}%</div>
                </div>
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div className="text-xs text-gray-500 mb-1">Structure</div>
                  <div className="text-blue-400 font-bold">{structureScore}%</div>
                </div>
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div className="text-xs text-gray-500 mb-1">Soft Skills</div>
                  <div className="text-violet-400 font-bold">{softSkillPct}%</div>
                </div>
              </div>
            </div>

            {/* Detail Cards Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Technical Skills Card */}
              <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col border-t-2 border-t-indigo-500/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mr-3">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-white">Compétences Techniques</h4>
                  </div>
                  <span className="text-lg font-bold text-indigo-400">{hardSkillPct}%</span>
                </div>

                <div className="space-y-4 flex-1">
                  {/* Found */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Trouvés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.primaryKeywords.scores.filter(k => k.points > 0).map((k, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                          {k.keyword}
                        </span>
                      ))}
                      {result.primaryKeywords.scores.filter(k => k.points > 0).length === 0 && (
                        <span className="text-xs text-gray-500">Aucun mot-clé trouvé</span>
                      )}
                    </div>
                  </div>
                  {/* Missing */}
                  {result.primaryKeywords.scores.filter(k => k.points === 0).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Manquants</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.primaryKeywords.scores.filter(k => k.points === 0).map((k, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Soft Skills Card */}
              <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col border-t-2 border-t-violet-500/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 mr-3">
                      <Heart className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-white">Soft Skills</h4>
                  </div>
                  <span className="text-lg font-bold text-violet-400">{softSkillPct}%</span>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Trouvés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.softSkills.scores.filter(s => s.found).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
                          {s.skill}
                        </span>
                      ))}
                      {result.softSkills.scores.filter(s => s.found).length === 0 && (
                        <span className="text-xs text-gray-500">Aucun soft skill trouvé</span>
                      )}
                    </div>
                  </div>
                  {result.softSkills.scores.filter(s => !s.found).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Manquants</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.softSkills.scores.filter(s => !s.found).map((s, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {s.skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Structure & Format Card (full width) */}
              <div className="md:col-span-2 bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 border-t-2 border-t-blue-500/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mr-3">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-white">Structure & Format</h4>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{structureScore}%</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {structureChecks.map((check, i) => (
                    <div key={i} className={`flex items-center p-3 rounded-lg border ${check.ok ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-red-500/5 border-red-500/20'}`}>
                      {check.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mr-3 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 mr-3 shrink-0" />
                      )}
                      <span className="text-sm text-gray-300">{check.label}</span>
                    </div>
                  ))}
                </div>

                {/* Extra details: word count, title check, contract, images */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    {result.profileSection?.found ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 mr-3 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mr-3 shrink-0" />
                    )}
                    <span className="text-sm text-gray-300">Section Profil</span>
                  </div>
                  <div className="flex items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    {result.titleCheck?.found ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 mr-3 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mr-3 shrink-0" />
                    )}
                    <span className="text-sm text-gray-300">Titre du poste</span>
                  </div>
                  <div className="flex items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    {result.contractType?.found ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 mr-3 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-400 mr-3 shrink-0" />
                    )}
                    <span className="text-sm text-gray-300">Type contrat</span>
                  </div>
                  <div className="flex items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className={`text-sm font-medium mr-2 ${(result.wordCount?.count ?? 0) >= 400 && (result.wordCount?.count ?? 0) <= 1200 ? 'text-green-400' : 'text-amber-400'}`}>
                      {result.wordCount?.count ?? 0}
                    </span>
                    <span className="text-sm text-gray-400">mots</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Keywords (if any) */}
          {result.secondaryKeywords.scores.length > 0 && (
            <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                    <Brain className="h-4 w-4" />
                  </div>
                  <h4 className="font-semibold text-white">Compétences transversales</h4>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${getSubScoreBadgeClass(result.secondaryKeywords.total, result.secondaryKeywords.maxTotal)}`}>
                  {getSubScoreLabel(result.secondaryKeywords.total, result.secondaryKeywords.maxTotal)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.secondaryKeywords.scores.map((k, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center ${
                      k.points > 0
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                  >
                    {k.points === 0 && <X className="h-3 w-3 mr-1" />}
                    {k.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Measurable Results */}
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Hash className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-white">Résultats mesurables</h4>
              </div>
              <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                (result.measurableResults?.count ?? 0) >= 5 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                (result.measurableResults?.count ?? 0) >= 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {result.measurableResults?.count ?? 0} détecté(s)
              </span>
            </div>
            {(result.measurableResults?.examples ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(result.measurableResults?.examples ?? []).map((ex, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                    {ex.trim()}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Privilégiez les pourcentages et chiffres concrets. Ex : "+35% de trafic", "budget de 50k€", "réduction de 20% des délais".
            </p>
          </div>

          {/* Proximity Bonus */}
          {result.proximity.bonus > 0 && (
            <div className="bg-[#18181b]/60 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Target className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-white">Bonus de proximité <span className="text-indigo-400">+{result.proximity.bonus} pts</span></h4>
              </div>
              <div className="space-y-1">
                {result.proximity.details.map((d, i) => (
                  <p key={i} className="text-xs text-gray-400">"{d.secondary}" proche de "{d.primary}"</p>
                ))}
              </div>
            </div>
          )}

          {/* Advice Section */}
          {adviceItems.length > 0 && (
            <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 border-l-4 border-l-indigo-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Lightbulb className="h-32 w-32 text-white" />
              </div>
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mr-3">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Conseils personnalisés pour atteindre {Math.min(score + 20, 100)}+</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {adviceItems.slice(0, 4).map((advice, i) => (
                  <div key={i} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="ml-4">
                      <h5 className="text-white font-medium text-sm mb-1">{advice.title}</h5>
                      <p className="text-gray-400 text-sm leading-relaxed">{advice.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
