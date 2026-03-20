import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  User, Bell, LogOut, Mail, Loader2, Save,
  RefreshCw, CheckCircle, AlertCircle, CreditCard, Zap, Crown,
  Brain, Upload, FileText, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Notifications } from "./Notifications";
import { STRIPE_PRODUCTS, FREE_PLAN } from "@/lib/stripe-config";
import { ACTIVITY_SECTORS } from "@/lib/activity-sectors";

const EXPERIENCE_LEVELS = [
  { value: "debutant", label: "Débutant (0–2 ans)" },
  { value: "confirme", label: "Confirmé (3–5 ans)" },
  { value: "senior", label: "Senior (6–10 ans)" },
  { value: "expert", label: "Expert (10+ ans)" },
];

const SECTOR_LABELS = ACTIVITY_SECTORS.map((s) => s.label);

interface UserPersonalProfile {
  first_name: string;
  last_name: string;
  phone: string;
  linkedin_url: string;
}

interface UserCandidateProfile {
  specialty: string;
  experience_level: string;
  objective: string;
  target_sectors: string[];
  professional_interests: string[];
  cv_content: string;
  profile_summary: string;
  cv_file_url: string;
}

interface UserPreferences {
  notify_on_response: boolean;
  notify_on_follow_up_reminder: boolean;
  notify_on_email_sent: boolean;
  follow_up_delay_days: number;
  auto_follow_up: boolean;
}

interface SubscriptionData {
  plan_type: string;
  sends_remaining: number;
  sends_limit: number;
  tokens_remaining: number;
  current_period_end: string | null;
}

export const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'subscription' | 'notifications' | 'preferences'>('profile');
  const [uploadingCV, setUploadingCV] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  const [personal, setPersonal] = useState<UserPersonalProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    linkedin_url: '',
  });

  const [candidate, setCandidate] = useState<UserCandidateProfile>({
    specialty: '',
    experience_level: '',
    objective: '',
    target_sectors: [],
    professional_interests: [],
    cv_content: '',
    profile_summary: '',
    cv_file_url: '',
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    notify_on_response: true,
    notify_on_follow_up_reminder: true,
    notify_on_email_sent: false,
    follow_up_delay_days: 10,
    auto_follow_up: false,
  });

  const [subscription, setSubscription] = useState<SubscriptionData>({
    plan_type: 'free',
    sends_remaining: 5,
    sends_limit: 5,
    tokens_remaining: 0,
    current_period_end: null,
  });

  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const showDebug = new URLSearchParams(window.location.search).get('debug') === 'gmail';

  // Profile completeness
  const computeCompleteness = () => {
    const fields = [
      personal.first_name,
      personal.last_name,
      personal.phone,
      personal.linkedin_url,
      candidate.specialty,
      candidate.experience_level,
      candidate.objective,
      candidate.target_sectors.length > 0 ? 'ok' : '',
      candidate.professional_interests.length > 0 ? 'ok' : '',
      candidate.cv_content,
      candidate.profile_summary,
    ];
    const filled = fields.filter(f => f && f.toString().trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  useEffect(() => {
    const checkGmailStatus = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (showDebug) setDebugInfo(`User ID: ${userId || 'none'}`);
      if (!userId) { setGmailConnected(false); return; }
      const { data: gmailData, error } = await supabase.from('gmail_tokens').select('id, updated_at').eq('user_id', userId).maybeSingle();
      if (showDebug) setDebugInfo(prev => `${prev}\nGmail: ${gmailData ? 'found' : 'not found'} ${error ? `(err: ${error.message})` : ''}`);
      setGmailConnected(!!gmailData);
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('gmailRefresh') === 'true') {
      params.delete('gmailRefresh');
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
      checkGmailStatus();
    }
    window.addEventListener('gmail-connected', checkGmailStatus);
    return () => window.removeEventListener('gmail-connected', checkGmailStatus);
  }, [showDebug]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, phone, linkedin_url, target_jobs, experience_level, objective, target_sectors, professional_interests, cv_content, profile_summary, cv_file_url')
        .single();

      if (profileData) {
        setPersonal({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          linkedin_url: profileData.linkedin_url || '',
        });
        setCandidate({
          specialty: profileData.target_jobs || '',
          experience_level: (profileData as any).experience_level || '',
          objective: profileData.objective || '',
          target_sectors: (profileData.target_sectors as string[]) || [],
          professional_interests: (profileData.professional_interests as string[]) || [],
          cv_content: profileData.cv_content || '',
          profile_summary: (profileData as any).profile_summary || '',
          cv_file_url: profileData.cv_file_url || '',
        });
      }

      const { data: prefData } = await supabase.from('user_preferences').select('*').single();
      if (prefData) {
        setPreferences({
          notify_on_response: prefData.notify_on_response ?? true,
          notify_on_follow_up_reminder: prefData.notify_on_follow_up_reminder ?? true,
          notify_on_email_sent: prefData.notify_on_email_sent ?? false,
          follow_up_delay_days: prefData.follow_up_delay_days ?? 10,
          auto_follow_up: prefData.auto_follow_up ?? false,
        });
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: gmailData } = await supabase.from('gmail_tokens').select('id').eq('user_id', userId).maybeSingle();
        setGmailConnected(!!gmailData);
      }

      const { data: subData } = await supabase.from('subscriptions').select('plan_type, sends_remaining, sends_limit, tokens_remaining, current_period_end').single();
      if (subData) {
        setSubscription({
          plan_type: subData.plan_type || 'free',
          sends_remaining: subData.sends_remaining || 0,
          sends_limit: subData.sends_limit || 5,
          tokens_remaining: subData.tokens_remaining || 0,
          current_period_end: subData.current_period_end,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      const fullName = `${personal.first_name.trim()} ${personal.last_name.trim()}`.trim();
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        first_name: personal.first_name.trim(),
        last_name: personal.last_name.trim(),
        full_name: fullName || null,
        phone: personal.phone.trim() || null,
        linkedin_url: personal.linkedin_url.trim() || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Profil personnel sauvegardé ✓" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCandidate = async () => {
    setSavingCandidate(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        target_jobs: candidate.specialty.trim() || null,
        experience_level: candidate.experience_level || null,
        objective: candidate.objective || null,
        target_sectors: candidate.target_sectors,
        professional_interests: candidate.professional_interests,
        cv_content: candidate.cv_content.trim() || null,
        profile_summary: candidate.profile_summary.trim() || null,
        cv_file_url: candidate.cv_file_url || null,
        updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast({ title: "Profil candidat sauvegardé ✓", description: "L'IA utilisera ces données pour vos prochaines candidatures." });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSavingCandidate(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user?.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Préférences sauvegardées" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = useCallback(async (file: File) => {
    if (!user) return;
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format non supporté", description: "PDF, DOCX ou TXT", variant: "destructive" });
      return;
    }
    setUploadingCV(true);
    setCvFileName(file.name);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('user-cvs').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      setCandidate(prev => ({ ...prev, cv_file_url: filePath }));

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data: parseResult } = await supabase.functions.invoke('parse-cv-document', {
        body: { fileBase64: base64, fileName: file.name, fileType: file.type }
      });

      if (parseResult?.text) {
        setCandidate(prev => ({ ...prev, cv_content: parseResult.text }));
        toast({ title: "CV analysé !", description: "Contenu extrait mis à jour." });
      } else {
        toast({ title: "CV uploadé", description: "Parsing non disponible, vous pouvez saisir le contenu manuellement." });
      }
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
      setCvFileName(null);
    } finally {
      setUploadingCV(false);
    }
  }, [user]);

  const toggleSector = (sector: string) => {
    setCandidate(prev => ({
      ...prev,
      target_sectors: prev.target_sectors.includes(sector)
        ? prev.target_sectors.filter(s => s !== sector)
        : [...prev.target_sectors, sector]
    }));
  };

  const completeness = computeCompleteness();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDebug && debugInfo && (
        <Card className="bg-muted/40 border-border">
          <CardContent className="p-4">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{debugInfo}</pre>
          </CardContent>
        </Card>
      )}
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground">Paramètres</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil et vos préférences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {[
                  { key: 'profile', icon: User, label: 'Profil' },
                  { key: 'subscription', icon: CreditCard, label: 'Abonnement' },
                  { key: 'notifications', icon: Bell, label: 'Notifications' },
                  { key: 'preferences', icon: RefreshCw, label: 'Préférences' },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>
              <Separator className="my-4" />
              <Button variant="ghost" onClick={signOut} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4 mr-3" />
                Déconnexion
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'profile' && (
            <>
              {/* Profile completeness */}
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">Complétude du profil</p>
                    <span className={`text-sm font-bold ${completeness >= 80 ? 'text-primary' : completeness >= 50 ? 'text-yellow-500' : 'text-destructive'}`}>
                      {completeness}%
                    </span>
                  </div>
                  <Progress value={completeness} className="h-2" />
                  {completeness < 60 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Un profil complet améliore significativement la qualité des emails générés par l'IA.
                    </p>
                  )}
                  {completeness >= 80 && (
                    <p className="text-xs text-primary mt-2">
                      ✓ Excellent ! L'IA dispose de tout ce qu'il faut pour personnaliser vos candidatures.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Section 1 — Personal info */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Mon profil
                  </CardTitle>
                  <CardDescription>Vos informations personnelles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input value={user?.email || ''} disabled className="bg-muted" />
                      <Badge variant="outline">Connecté</Badge>
                    </div>
                  </div>

                  {/* Gmail status */}
                  <div>
                    <Label className="text-muted-foreground">Connexion Gmail</Label>
                    <div className="flex flex-col gap-3 mt-1.5">
                      {gmailConnected ? (
                        <>
                          <div className="flex items-center gap-3">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Connecté
                            </Badge>
                            <span className="text-sm text-muted-foreground">Vous pouvez envoyer des emails</span>
                          </div>
                          <Button variant="outline" size="sm" className="w-fit" onClick={async () => {
                            await supabase.from('gmail_tokens').delete().eq('user_id', user?.id);
                            window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=settings');
                          }}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Reconnecter Gmail
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="destructive" className="gap-1 w-fit">
                            <AlertCircle className="h-3 w-3" /> Non connecté
                          </Badge>
                          <Button variant="outline" size="sm" className="w-fit" onClick={() => {
                            window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=settings');
                          }}>
                            <Mail className="h-4 w-4 mr-2" /> Connecter Gmail
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name" className="text-muted-foreground">Prénom</Label>
                      <Input id="first_name" value={personal.first_name} onChange={(e) => setPersonal({ ...personal, first_name: e.target.value })} placeholder="Marie" className="mt-1.5 bg-background" />
                    </div>
                    <div>
                      <Label htmlFor="last_name" className="text-muted-foreground">Nom</Label>
                      <Input id="last_name" value={personal.last_name} onChange={(e) => setPersonal({ ...personal, last_name: e.target.value })} placeholder="Dupont" className="mt-1.5 bg-background" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-muted-foreground">Téléphone</Label>
                    <Input id="phone" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} placeholder="+33 6 00 00 00 00" className="mt-1.5 bg-background" />
                  </div>

                  <div>
                    <Label htmlFor="linkedin" className="text-muted-foreground">LinkedIn</Label>
                    <Input id="linkedin" value={personal.linkedin_url} onChange={(e) => setPersonal({ ...personal, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." className="mt-1.5 bg-background" />
                  </div>

                  <Button onClick={handleSavePersonal} disabled={saving} className="w-full">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Sauvegarder mon profil
                  </Button>
                </CardContent>
              </Card>

              {/* Section 2 — Candidate profile for AI */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Profil candidat — utilisé par l'IA
                  </CardTitle>
                  <CardDescription>
                    Ces données sont utilisées par l'IA pour personnaliser vos emails et lettres de motivation. Plus c'est complet, meilleurs sont les résultats.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Specialty */}
                  <div>
                    <Label htmlFor="specialty" className="text-muted-foreground">Spécialité / métiers visés</Label>
                    <Input
                      id="specialty"
                      value={candidate.specialty}
                      onChange={(e) => setCandidate({ ...candidate, specialty: e.target.value })}
                      placeholder="Ex : Marketing digital, Développement web, Comptabilité..."
                      className="mt-1.5 bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Utilisé dans l'objet de vos emails</p>
                  </div>

                  {/* Experience level */}
                  <div>
                    <Label className="text-muted-foreground">Années d'expérience</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setCandidate({ ...candidate, experience_level: level.value })}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                            candidate.experience_level === level.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card hover:border-primary/40 text-foreground'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <Label htmlFor="objective" className="text-muted-foreground">Objectifs professionnels</Label>
                    <Input
                      id="objective"
                      value={candidate.objective}
                      onChange={(e) => setCandidate({ ...candidate, objective: e.target.value })}
                      placeholder="Ex : stage, cdi_cdd, freelance"
                      className="mt-1.5 bg-background"
                    />
                  </div>

                  {/* Target sectors */}
                  <div>
                    <Label className="text-muted-foreground">Secteurs cibles</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded-lg border border-border">
                      {SECTOR_LABELS.slice(0, 30).map((sector) => (
                        <button
                          key={sector}
                          type="button"
                          onClick={() => toggleSector(sector)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            candidate.target_sectors.includes(sector)
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-background text-muted-foreground border border-border hover:border-primary/40'
                          }`}
                        >
                          {sector}
                        </button>
                      ))}
                    </div>
                    {candidate.target_sectors.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{candidate.target_sectors.length} secteur(s) sélectionné(s)</p>
                    )}
                  </div>

                  <Separator />

                  {/* CV upload */}
                  <div>
                    <Label className="text-muted-foreground">CV (nouveau fichier)</Label>
                    <div className="mt-1.5">
                      {candidate.cv_file_url ? (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground flex-1 truncate">{cvFileName || "CV uploadé"}</span>
                          <button onClick={() => { setCandidate(prev => ({ ...prev, cv_file_url: '' })); setCvFileName(null); }} className="text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
                          <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCVUpload(f); }} />
                          {uploadingCV ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm text-muted-foreground">
                            {uploadingCV ? "Analyse en cours..." : "Uploader un nouveau CV (PDF, DOCX, TXT)"}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Profile summary */}
                  <div>
                    <Label htmlFor="profile_summary" className="text-muted-foreground">
                      Résumé de votre profil
                    </Label>
                    <Textarea
                      id="profile_summary"
                      value={candidate.profile_summary}
                      onChange={(e) => setCandidate({ ...candidate, profile_summary: e.target.value })}
                      placeholder="Décrivez votre parcours, vos compétences clés, ce que vous recherchez..."
                      className="mt-1.5 bg-background resize-none min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ce texte est utilisé par l'IA en complément de votre CV — décrivez-vous avec vos propres mots.
                    </p>
                  </div>

                  {/* CV content — read-only preview + editable */}
                  {candidate.cv_content && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">Ce que l'IA a extrait de votre CV</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto bg-background rounded-md border border-border p-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                        {candidate.cv_content}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        👆 C'est exactement ce que l'IA lit pour personnaliser vos candidatures. Si quelque chose est incorrect, corrigez-le ci-dessous.
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="cv_content" className="text-muted-foreground">
                      {candidate.cv_content ? "Modifier le contenu extrait" : "Contenu CV extrait"}
                    </Label>
                    <Textarea
                      id="cv_content"
                      value={candidate.cv_content}
                      onChange={(e) => setCandidate({ ...candidate, cv_content: e.target.value })}
                      placeholder="Le contenu de votre CV extrait automatiquement apparaît ici. Vous pouvez le corriger si besoin."
                      className="mt-1.5 bg-background resize-none min-h-[180px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Extrait automatiquement de votre CV — vous pouvez le corriger si l'extraction n'est pas parfaite.
                    </p>
                  </div>

                  <Button onClick={handleSaveCandidate} disabled={savingCandidate} className="w-full">
                    {savingCandidate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Sauvegarder le profil candidat
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === 'subscription' && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Mon abonnement
                </CardTitle>
                <CardDescription>Gérez votre plan et vos crédits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {subscription.plan_type === 'plus' ? (
                      <Crown className="h-6 w-6 text-primary" />
                    ) : subscription.plan_type === 'simple' ? (
                      <Zap className="h-6 w-6 text-primary" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-semibold capitalize">Plan {subscription.plan_type}</p>
                      {subscription.current_period_end && (
                        <p className="text-xs text-muted-foreground">
                          Renouvellement: {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => navigate('/pricing')}>
                    {subscription.plan_type === 'free' ? 'Upgrade' : 'Changer de plan'}
                  </Button>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Crédits mensuels</Label>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Envois restants</span>
                      <span className="font-medium">{subscription.sends_remaining} / {subscription.sends_limit}</span>
                    </div>
                    <Progress value={(subscription.sends_remaining / Math.max(subscription.sends_limit, 1)) * 100} />
                  </div>
                </div>
                {subscription.tokens_remaining > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm"><span className="font-medium">Tokens bonus:</span> {subscription.tokens_remaining} crédits</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => navigate('/pricing')}>
                  Acheter des crédits supplémentaires
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && <Notifications />}

          {activeSection === 'preferences' && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Préférences
                </CardTitle>
                <CardDescription>Configurez le comportement de l'application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Notifications</Label>
                  {[
                    { key: 'notify_on_response', label: 'Réponses reçues', sub: 'Être notifié lors d\'une réponse' },
                    { key: 'notify_on_follow_up_reminder', label: 'Rappels de relance', sub: 'Être rappelé pour les relances' },
                    { key: 'notify_on_email_sent', label: 'Emails envoyés', sub: 'Confirmation d\'envoi' },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
                      <Switch
                        checked={preferences[key as keyof UserPreferences] as boolean}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, [key]: checked })}
                      />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Relances</Label>
                  <div>
                    <Label htmlFor="delay" className="text-muted-foreground">Délai avant relance (jours)</Label>
                    <Input id="delay" type="number" min={1} max={30} value={preferences.follow_up_delay_days}
                      onChange={(e) => setPreferences({ ...preferences, follow_up_delay_days: parseInt(e.target.value) || 10 })}
                      className="mt-1.5 bg-background w-32" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Relances automatiques</p><p className="text-xs text-muted-foreground">Envoyer automatiquement les relances</p></div>
                    <Switch checked={preferences.auto_follow_up} onCheckedChange={(checked) => setPreferences({ ...preferences, auto_follow_up: checked })} />
                  </div>
                </div>
                <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
