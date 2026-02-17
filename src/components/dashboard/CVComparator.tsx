import React, { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle, Target, Brain, Heart, Image, Briefcase, FileCheck, Mail, Phone, MapPin, Globe, User, Hash, FileType, RotateCcw } from "lucide-react";

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
  if (score > 70) return "hsl(142, 71%, 45%)";
  if (score >= 40) return "hsl(38, 92%, 50%)";
  return "hsl(0, 84%, 60%)";
};

const getScoreLabel = (score: number) => {
  if (score > 70) return "Excellent";
  if (score >= 40) return "À améliorer";
  return "Insuffisant";
};

const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
    {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
    {label}
  </div>
);

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

  const scoreColor = result ? getScoreColor(result.totalScore ?? 0) : "#888";
  const pieData = result ? [
    { name: "Score", value: result.totalScore ?? 0 },
    { name: "Restant", value: Math.max(0, 100 - (result.totalScore ?? 0)) },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Score CV — Comparateur ATS</h1>
        <p className="text-muted-foreground mt-1">Comparez un CV avec une fiche de poste pour évaluer la correspondance</p>
      </div>

      {/* Form - hidden when results are shown */}
      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Fiche de poste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Intitulé du poste</label>
                  <Input
                    placeholder="Ex: Alternance Chef de Projets Marketing H/F"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description du poste</label>
                  <Textarea
                    placeholder="Collez ici le contenu complet de la fiche de poste..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: CV upload */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  CV à analyser
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                >
                  {isParsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Extraction du texte...</p>
                    </div>
                  ) : cvFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileCheck className="h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium text-foreground">{cvFile.name}</p>
                      <p className="text-xs text-muted-foreground">{cvText.length} caractères extraits</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Cliquez pour importer un CV</p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX ou TXT</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !cvText || !jobDescription || !jobTitle}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Analyser la correspondance
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {!result && !isAnalyzing && (
              <Card className="flex items-center justify-center min-h-[200px]">
                <div className="text-center text-muted-foreground p-8">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">En attente d'analyse</p>
                  <p className="text-sm mt-1">Importez un CV et une fiche de poste pour commencer</p>
                </div>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="flex items-center justify-center min-h-[200px]">
                <div className="text-center p-8">
                  <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-lg font-medium text-foreground">Analyse en cours...</p>
                  <p className="text-sm text-muted-foreground mt-1">Identification du métier et calcul du score</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Results - full width when shown */}
      {result && (
        <div className="space-y-4">
          <Button
            onClick={() => {
              setResult(null);
              setCvText("");
              setCvFile(null);
              setJobTitle("");
              setJobDescription("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle analyse
          </Button>
              {/* Extraction Warning */}
              {result.extractionWarning && (
                <Card className="border-orange-500/50 bg-orange-500/5">
                  <CardContent className="py-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">⚠️ CV incomplet ou mal formaté — Analyse partielle</span>
                  </CardContent>
                </Card>
              )}

              {/* Score Chart */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                            <Cell fill={scoreColor} />
                            <Cell fill="hsl(var(--muted))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold" style={{ color: scoreColor }}>{Math.round(result.totalScore)}</span>
                        <span className="text-xs text-muted-foreground">/ 100 pts</span>
                        <span className="text-xs font-medium mt-1" style={{ color: scoreColor }}>{getScoreLabel(result.totalScore)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 1. Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Informations de contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <CheckItem ok={result.contactInfo?.email ?? false} label={result.contactInfo?.email ? "Email détecté" : "Email non détecté"} />
                  <CheckItem ok={result.contactInfo?.phone ?? false} label={result.contactInfo?.phone ? "Téléphone détecté" : "Téléphone non détecté"} />
                  <CheckItem ok={result.contactInfo?.address ?? false} label={result.contactInfo?.address ? "Adresse/ville détectée" : "Adresse non détectée"} />
                  <CheckItem ok={result.contactInfo?.web ?? false} label={result.contactInfo?.web ? "LinkedIn ou site web détecté" : "Aucun lien web détecté"} />
                </CardContent>
              </Card>

              {/* 2. Resume/Profile Section */}
              <Card>
                <CardContent className="py-3">
                  <CheckItem
                    ok={result.profileSection?.found ?? false}
                    label={result.profileSection?.found
                      ? "Section Profil/Résumé détectée"
                      : "Aucune section Profil ou Résumé détectée"}
                  />
                </CardContent>
              </Card>

              {/* 3. Required Sections */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Sections obligatoires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {(result.sections?.checks ?? []).map((s, i) => (
                    <CheckItem key={i} ok={s.found} label={s.found ? `Section '${s.section}' détectée` : `Section '${s.section}' non détectée`} />
                  ))}
                </CardContent>
              </Card>

              {/* 4. Profession Identified */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Métier identifié
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mt-0">{result.profession.name}</Badge>
                  {result.profession.isPartialMatch && (
                    <p className="text-xs text-muted-foreground mt-1">Correspondance partielle</p>
                  )}
                </CardContent>
              </Card>

              {/* 5. Primary Keywords */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Compétences techniques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {result.primaryKeywords.scores.map((k, i) => (
                      <Badge
                        key={i}
                        variant={k.points >= k.maxPoints * 0.8 ? "default" : k.points > 0 ? "secondary" : "outline"}
                        className={`text-xs ${k.points >= k.maxPoints * 0.8 ? '' : k.points > 0 ? 'border-orange-500/50 text-orange-600 dark:text-orange-400' : 'opacity-50'}`}
                      >
                        {k.points >= k.maxPoints * 0.8 ? '✅' : k.points > 0 ? '⚠️' : '❌'} {k.keyword}
                      </Badge>
                    ))}
                  </div>
                  {(() => {
                    const missing = result.primaryKeywords.scores.filter(k => k.points === 0);
                    const weak = result.primaryKeywords.scores.filter(k => k.points > 0 && k.points < k.maxPoints * 0.8);
                    return (missing.length > 0 || weak.length > 0) ? (
                      <p className="text-xs text-muted-foreground mt-2 bg-accent/50 rounded-md p-2">
                        💡 <span className="font-medium">Conseil :</span>
                        {missing.length > 0 && <> Ajoutez les mots-clés manquants dans votre CV : <span className="font-medium">{missing.map(k => `"${k.keyword}"`).join(', ')}</span>.</>}
                        {weak.length > 0 && <> Renforcez la présence de : <span className="font-medium">{weak.map(k => `"${k.keyword}"`).join(', ')}</span> en les mentionnant davantage.</>}
                      </p>
                    ) : null;
                  })()}
                  {result.primaryKeywords.bonusKeywords.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Bonus:</span> {result.primaryKeywords.bonusKeywords.map(b => b.keyword).join(', ')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6. Secondary Keywords */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Compétences transversales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {result.secondaryKeywords.scores.map((k, i) => (
                      <Badge key={i} variant={k.points > 0 ? "default" : "outline"} className={`text-xs ${k.points === 0 ? 'opacity-50' : ''}`}>
                        {k.points > 0 ? '✅' : '❌'} {k.keyword}
                      </Badge>
                    ))}
                  </div>
                  {(() => {
                    const missing = result.secondaryKeywords.scores.filter(k => k.points === 0);
                    return missing.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-2 bg-accent/50 rounded-md p-2">
                        💡 <span className="font-medium">Conseil :</span> Intégrez ces termes dans vos descriptions d'expériences : <span className="font-medium">{missing.map(k => `"${k.keyword}"`).join(', ')}</span>.
                      </p>
                    ) : null;
                  })()}
                  {result.secondaryKeywords.bonusKeywords.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Bonus:</span> {result.secondaryKeywords.bonusKeywords.map(b => b.keyword).join(', ')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 7. Soft Skills */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Soft skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {result.softSkills.scores.map((s, i) => (
                      <Badge key={i} variant={s.found ? "default" : "outline"} className={`text-xs ${!s.found ? 'opacity-50' : ''}`}>
                        {s.found ? '✅' : '❌'} {s.skill}
                      </Badge>
                    ))}
                  </div>
                  {(() => {
                    const missing = result.softSkills.scores.filter(s => !s.found);
                    return missing.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-2 bg-accent/50 rounded-md p-2">
                        💡 <span className="font-medium">Conseil :</span> Mentionnez ces qualités dans vos expériences ou votre profil : <span className="font-medium">{missing.map(s => `"${s.skill}"`).join(', ')}</span>.
                      </p>
                    ) : null;
                  })()}
                </CardContent>
              </Card>

              {/* 8. Measurable Results */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Résultats mesurables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {result.measurableResults?.count ?? 0} résultat(s) chiffré(s) détecté(s)
                    {(result.measurableResults?.count ?? 0) >= 5 ? ' — Excellent !' : (result.measurableResults?.count ?? 0) >= 1 ? ' — Ajoutez plus de chiffres.' : ''}
                  </p>
                  {(result.measurableResults?.examples ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(result.measurableResults?.examples ?? []).map((ex, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{ex.trim()}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 bg-accent/50 rounded-md p-2">
                    💡 <span className="font-medium">Conseil :</span> Privilégiez les pourcentages et chiffres concrets dans vos expériences. Ex : "Augmentation du trafic de <span className="font-medium">+35%</span>", "Gestion d'un budget de <span className="font-medium">50k€</span>", "Réduction des délais de <span className="font-medium">20%</span>". Les recruteurs et ATS valorisent les résultats mesurables.
                  </p>
                </CardContent>
              </Card>

              {/* 9. Word Count */}
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileType className="h-4 w-4 text-primary shrink-0" />
                    <span className={(result.wordCount?.score ?? 0) >= 5 ? 'text-green-600 dark:text-green-400' : (result.wordCount?.score ?? 0) >= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-red-500'}>
                      {result.wordCount?.count ?? 0} mots
                      {(result.wordCount?.count ?? 0) < 200 && ' — CV trop court'}
                      {(result.wordCount?.count ?? 0) >= 200 && (result.wordCount?.count ?? 0) < 400 && ' — Un peu court, visez 400-1200 mots'}
                      {(result.wordCount?.count ?? 0) >= 400 && (result.wordCount?.count ?? 0) <= 1200 && ' — Longueur idéale'}
                      {(result.wordCount?.count ?? 0) > 1200 && ' — CV un peu long, visez 400-1200 mots'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 10. Title Check */}
              <Card>
                <CardContent className="py-3">
                  <CheckItem
                    ok={result.titleCheck?.found ?? false}
                    label={result.titleCheck?.found
                      ? "Intitulé du poste présent dans le CV"
                      : "Intitulé du poste non mentionné dans le CV"}
                  />
                </CardContent>
              </Card>

              {/* 11. Contract Type */}
              <Card>
                <CardContent className="py-3">
                  <CheckItem
                    ok={!!result.contractType?.found}
                    label={result.contractType?.found
                      ? `Type de contrat '${result.contractType.found}' mentionné`
                      : "Type de contrat non spécifié"}
                  />
                </CardContent>
              </Card>

              {/* 12. Images */}
              <Card>
                <CardContent className="py-3">
                  <CheckItem
                    ok={result.images.penalty === 0}
                    label={result.images.penalty < 0
                      ? `Trop d'éléments visuels (${result.images.count} images, ${result.images.penalty} pts)`
                      : "Format du CV approprié"}
                  />
                </CardContent>
              </Card>

              {/* Proximity Bonus */}
              {result.proximity.bonus > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">🎯 Bonus de proximité (+{result.proximity.bonus} pts)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {result.proximity.details.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">"{d.secondary}" proche de "{d.primary}"</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}
    </div>
  );
};
