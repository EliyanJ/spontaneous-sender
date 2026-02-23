import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, Mail, Clock, AlertCircle, Send, 
  Calendar, Trash2, RefreshCw, Settings2, ChevronDown, ChevronUp, X,
  Search, BarChart3, List, TrendingUp, ThumbsUp, ThumbsDown, MinusCircle, MessageSquare,
  ArrowRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Campaign {
  id: string;
  recipient: string;
  subject: string;
  sent_at: string;
  follow_up_status: string;
  follow_up_delay_days: number;
  response_detected_at: string | null;
  response_category: string | null;
  response_summary: string | null;
  subject_type: string | null;
  tone: string | null;
  user_feedback: string | null;
  feedback_notes: string | null;
}

interface ScheduledEmail {
  id: string;
  gmail_draft_id: string;
  subject: string;
  recipients: string[];
  scheduled_for: string;
  status: string;
}

interface CampaignBatch {
  id: string;
  timestamp: string;
  campaigns: Campaign[];
  subject: string;
}

interface PipelineCompany {
  id: string;
  nom: string;
  ville: string;
  pipeline_stage: string;
  selected_email?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
  libelle_ape?: string | null;
}

interface PipelineStats {
  total: number;
  parPhase: Record<string, number>;
}

const PIPELINE_STAGES = [
  { value: "nouveau", label: "📝 Nouveau", color: "#3b82f6", colorClass: "border-blue-500" },
  { value: "candidature_envoyee", label: "📧 Candidature envoyée", color: "#a855f7", colorClass: "border-purple-500" },
  { value: "en_attente", label: "⏳ En attente", color: "#eab308", colorClass: "border-yellow-500" },
  { value: "relance", label: "🔄 Relance", color: "#f97316", colorClass: "border-orange-500" },
  { value: "entretien", label: "🎯 Entretien", color: "#6366f1", colorClass: "border-indigo-500" },
  { value: "offre_recue", label: "🎁 Offre reçue", color: "#22c55e", colorClass: "border-green-500" },
  { value: "refuse", label: "❌ Refusé", color: "#ef4444", colorClass: "border-red-500" },
  { value: "accepte", label: "🎉 Accepté", color: "#10b981", colorClass: "border-emerald-500" },
];

export const CampaignsHub = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'campaigns' | 'suivi'>('campaigns');
  const [followUpDelay, setFollowUpDelay] = useState(10);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [excludedFromRelance, setExcludedFromRelance] = useState<Set<string>>(new Set());
  const [relancingBatch, setRelancingBatch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pipeline state
  const [pipelineCompanies, setPipelineCompanies] = useState<PipelineCompany[]>([]);
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineView, setPipelineView] = useState<"list" | "stats">("list");
  const [updatingCompany, setUpdatingCompany] = useState<string | null>(null);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({ total: 0, parPhase: {} });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('follow_up_delay_days')
        .eq('user_id', user.id)
        .single();
      if (prefData) setFollowUpDelay(prefData.follow_up_delay_days || 10);

      const { data: campaignsData } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });
      setCampaigns(campaignsData || []);

      const { data: scheduledData } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });
      setScheduledEmails(scheduledData || []);

      // Load pipeline companies
      const { data: companiesData } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      setPipelineCompanies(companiesData || []);
      calculatePipelineStats(companiesData || []);

    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculatePipelineStats = (companiesData: PipelineCompany[]) => {
    const parPhase: Record<string, number> = {};
    PIPELINE_STAGES.forEach(stage => {
      parPhase[stage.value] = companiesData.filter(c => c.pipeline_stage === stage.value).length;
    });
    setPipelineStats({ total: companiesData.length, parPhase });
  };

  const getDaysSinceSent = (sentAt: string) => {
    const diff = new Date().getTime() - new Date(sentAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const campaignBatches = useMemo(() => {
    const batches: CampaignBatch[] = [];
    const sortedCampaigns = [...campaigns].sort((a, b) => 
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );

    sortedCampaigns.forEach(campaign => {
      const campaignTime = new Date(campaign.sent_at).getTime();
      const existingBatch = batches.find(batch => {
        const batchTime = new Date(batch.timestamp).getTime();
        const timeDiff = Math.abs(campaignTime - batchTime);
        return timeDiff <= 5 * 60 * 1000 && batch.subject === campaign.subject;
      });

      if (existingBatch) {
        existingBatch.campaigns.push(campaign);
      } else {
        batches.push({
          id: `batch-${campaign.sent_at}-${campaign.subject}`,
          timestamp: campaign.sent_at,
          campaigns: [campaign],
          subject: campaign.subject,
        });
      }
    });

    return batches;
  }, [campaigns]);

  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return campaignBatches;
    const query = searchQuery.toLowerCase();
    return campaignBatches.filter(batch => 
      batch.subject.toLowerCase().includes(query) ||
      batch.campaigns.some(c => c.recipient.toLowerCase().includes(query))
    );
  }, [campaignBatches, searchQuery]);

  const batchesWithPendingRelances = useMemo(() => {
    return filteredBatches.filter(batch => {
      const daysSince = getDaysSinceSent(batch.timestamp);
      return daysSince >= followUpDelay && batch.campaigns.some(c => 
        c.follow_up_status === 'pending' && !c.response_detected_at
      );
    });
  }, [filteredBatches, followUpDelay]);

  const filteredPipelineCompanies = useMemo(() => {
    if (!pipelineSearch.trim()) return pipelineCompanies;
    const query = pipelineSearch.toLowerCase();
    return pipelineCompanies.filter(c => 
      c.nom.toLowerCase().includes(query) ||
      c.ville?.toLowerCase().includes(query) ||
      c.libelle_ape?.toLowerCase().includes(query) ||
      c.selected_email?.toLowerCase().includes(query)
    );
  }, [pipelineCompanies, pipelineSearch]);

  const pieChartData = useMemo(() => {
    return PIPELINE_STAGES
      .filter(stage => pipelineStats.parPhase[stage.value] > 0)
      .map(stage => ({
        name: stage.label.replace(/^[^\s]+ /, ''),
        value: pipelineStats.parPhase[stage.value],
        color: stage.color,
      }));
  }, [pipelineStats]);

  const barChartData = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      name: stage.label.replace(/^[^\s]+ /, ''),
      count: pipelineStats.parPhase[stage.value] || 0,
      fill: stage.color,
    }));
  }, [pipelineStats]);

  const getTimeUntilSend = (scheduledFor: string) => {
    const diff = new Date(scheduledFor).getTime() - new Date().getTime();
    if (diff < 0) return "En cours...";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `Dans ${Math.floor(hours / 24)} jour(s)`;
    if (hours > 0) return `Dans ${hours}h ${minutes}min`;
    return `Dans ${minutes} min`;
  };

  const handleSendFollowUp = async (campaignId: string, recipient: string, originalSubject: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const followUpBody = `Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature spontanée.\n\nJe reste disponible pour échanger.\n\nCordialement`;

      const { error } = await supabase.functions.invoke('send-gmail-emails', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { recipients: [recipient], subject: `Relance: ${originalSubject}`, body: followUpBody },
      });

      if (error) throw error;

      await supabase
        .from('email_campaigns')
        .update({ follow_up_status: 'sent', follow_up_sent_at: new Date().toISOString() })
        .eq('id', campaignId);

      toast({ title: "Relance envoyée" });
      loadData();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRelanceBatch = async (batch: CampaignBatch) => {
    const campaignsToRelance = batch.campaigns.filter(c => 
      !excludedFromRelance.has(c.id) && 
      c.follow_up_status === 'pending' && 
      !c.response_detected_at
    );

    if (campaignsToRelance.length === 0) {
      toast({ title: "Aucune relance à envoyer", description: "Toutes les entreprises ont été exclues ou ont déjà répondu" });
      return;
    }

    setRelancingBatch(batch.id);
    let successCount = 0;
    let errorCount = 0;

    for (const campaign of campaignsToRelance) {
      try {
        await handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setRelancingBatch(null);
    toast({ 
      title: "Relances envoyées", 
      description: `${successCount} relance(s) envoyée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}` 
    });
    loadData();
  };

  const handleCancelScheduled = async (emailId: string) => {
    setCancelling(emailId);
    try {
      await supabase.from('scheduled_emails').update({ status: 'cancelled' }).eq('id', emailId);
      toast({ title: "Email annulé" });
      loadData();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  const updateFollowUpDelay = async (newDelay: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_preferences')
        .update({ follow_up_delay_days: newDelay })
        .eq('user_id', user.id);

      setFollowUpDelay(newDelay);
      toast({ title: "Délai mis à jour" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleExcludeFromRelance = (campaignId: string) => {
    setExcludedFromRelance(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const [feedbackNoteId, setFeedbackNoteId] = useState<string | null>(null);
  const [feedbackNoteText, setFeedbackNoteText] = useState("");

  const handleSetFeedback = async (campaignId: string, feedback: string) => {
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ user_feedback: feedback } as any)
        .eq('id', campaignId);
      if (error) throw error;
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, user_feedback: feedback } : c));
      toast({ title: "Feedback enregistré" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleSaveFeedbackNote = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ feedback_notes: feedbackNoteText } as any)
        .eq('id', campaignId);
      if (error) throw error;
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, feedback_notes: feedbackNoteText } : c));
      setFeedbackNoteId(null);
      setFeedbackNoteText("");
      toast({ title: "Note sauvegardée" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const moveCompany = async (companyId: string, newStage: string) => {
    setUpdatingCompany(companyId);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ pipeline_stage: newStage })
        .eq("id", companyId);

      if (error) throw error;
      toast({ title: "Phase mise à jour" });
      await loadData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    } finally {
      setUpdatingCompany(null);
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.substring(0, 2).toUpperCase();
  };

  const getResponseTag = (category: string | null) => {
    if (!category) return null;
    const map: Record<string, { label: string; className: string }> = {
      positive: { label: '[Positif]', className: 'text-green-400 font-semibold' },
      negative: { label: '[Négatif]', className: 'text-red-400 font-semibold' },
      neutral: { label: '[Info]', className: 'text-blue-400 font-semibold' },
    };
    return map[category] || map['neutral'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campagnes</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Gère tes campagnes, relances et suivi des candidatures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-[#27272a]/40 border border-white/[0.05] hover:bg-[#27272a]/60 text-zinc-400 hover:text-white">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[#18181b]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Délai avant relance</Label>
                  <Select 
                    value={followUpDelay.toString()} 
                    onValueChange={(v) => updateFollowUpDelay(parseInt(v))}
                  >
                    <SelectTrigger className="bg-[#18181b]/30 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b]/90 backdrop-blur-xl border border-white/[0.08]">
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="10">10 jours</SelectItem>
                      <SelectItem value="14">14 jours</SelectItem>
                      <SelectItem value="21">21 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            onClick={loadData} 
            size="sm" 
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* ===== TABS CAMPAGNES / SUIVI ===== */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
        <button
          onClick={() => setMainTab('campaigns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'campaigns' 
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
              : 'text-zinc-500 hover:text-white border border-transparent'
          }`}
        >
          <Send className="h-4 w-4" />
          Campagnes
        </button>
        <button
          onClick={() => setMainTab('suivi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'suivi' 
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
              : 'text-zinc-500 hover:text-white border border-transparent'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Suivi
        </button>
      </div>

      {/* ================= CAMPAGNES TAB ================= */}
      {mainTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Rechercher par sujet ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-[#18181b]/30 border-white/10 rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/30 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Banner relances nécessaires */}
          {batchesWithPendingRelances.length > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 shrink-0">
                <AlertCircle className="h-5 w-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">
                  {batchesWithPendingRelances.length} batch{batchesWithPendingRelances.length > 1 ? 'es' : ''} ont dépassé le délai de {followUpDelay} jours
                </p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Vérifiez que vous n'avez pas reçu de réponses avant de relancer.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 rounded-lg">
                    Tout relancer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Confirmer la relance groupée</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      Vous allez relancer {batchesWithPendingRelances.length} batch(es). Avez-vous vérifié que vous n'avez pas reçu de réponses ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[#27272a] border-white/10 text-white hover:bg-[#3f3f46]">Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => batchesWithPendingRelances.forEach(b => handleRelanceBatch(b))}
                    >
                      Confirmer et relancer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Scheduled emails section */}
          {scheduledEmails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10">
                  <Clock className="h-4 w-4 text-indigo-400" />
                </div>
                Emails programmés ({scheduledEmails.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scheduledEmails.map((email) => (
                  <div 
                    key={email.id} 
                    className="p-4 rounded-xl bg-[#27272a]/40 backdrop-blur-lg border border-white/[0.05] hover:bg-[#27272a]/60 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {getTimeUntilSend(email.scheduled_for)}
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" disabled={cancelling === email.id}>
                            {cancelling === email.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Annuler l'email ?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              L'email "{email.subject}" ne sera pas envoyé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#27272a] border-white/10 text-white hover:bg-[#3f3f46]">Retour</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelScheduled(email.id)}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Annuler l'envoi
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="text-sm font-medium text-white truncate mb-1">{email.subject}</p>
                    <div className="flex flex-wrap gap-1">
                      {email.recipients.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#18181b]/50 text-zinc-400 border border-white/[0.05]">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique des envois */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/10">
                <Clock className="h-4 w-4 text-teal-400" />
              </div>
              Historique des envois
            </h3>

            {filteredBatches.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] border-dashed">
                <Mail className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-500">
                  {searchQuery ? "Aucune campagne trouvée" : "Aucune campagne envoyée"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBatches.map((batch) => {
                  const daysSince = getDaysSinceSent(batch.timestamp);
                  const pendingCampaigns = batch.campaigns.filter(c => 
                    c.follow_up_status === 'pending' && !c.response_detected_at
                  );
                  const activeCampaigns = pendingCampaigns.filter(c => !excludedFromRelance.has(c.id));
                  const canRelance = daysSince >= followUpDelay && pendingCampaigns.length > 0;
                  const isExpanded = expandedBatch === batch.id;

                  return (
                    <div 
                      key={batch.id} 
                      className={`rounded-xl bg-[#18181b]/60 backdrop-blur-xl border transition-all ${
                        canRelance ? 'border-orange-500/20' : 'border-white/[0.08]'
                      }`}
                    >
                      {/* Batch header */}
                      <div 
                        className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/[0.02] rounded-xl transition-colors"
                        onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                            canRelance ? 'bg-orange-500/20' : 'bg-indigo-500/10'
                          }`}>
                            <Send className={`h-4 w-4 ${canRelance ? 'text-orange-400' : 'text-indigo-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white truncate">{batch.subject}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#27272a]/60 text-zinc-400 border border-white/[0.05]">
                                {batch.campaigns.length} email{batch.campaigns.length > 1 ? 's' : ''}
                              </span>
                              {canRelance ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  Relance requise
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                                  En cours
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {new Date(batch.timestamp).toLocaleString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-zinc-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                      </div>

                      {/* Batch expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05]">
                          <div className="pt-3 space-y-2">
                            {batch.campaigns.map((campaign) => {
                              const isExcluded = excludedFromRelance.has(campaign.id);
                              const isPending = campaign.follow_up_status === 'pending' && !campaign.response_detected_at;
                              const responseTag = getResponseTag(campaign.response_category);
                              
                              return (
                                <div 
                                  key={campaign.id} 
                                  className={`p-3 rounded-lg transition-all ${
                                    isExcluded 
                                      ? 'bg-[#18181b]/20 opacity-50' 
                                      : 'bg-[#27272a]/30 hover:bg-[#27272a]/50'
                                  } border border-white/[0.03]`}
                                >
                                  <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Avatar initiales */}
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-medium text-white">{getInitials(campaign.recipient)}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <span className={`text-sm text-white ${isExcluded ? 'line-through' : ''}`}>
                                          {campaign.recipient}
                                        </span>
                                        <p className="text-xs text-zinc-500">
                                          Envoyé il y a {getDaysSinceSent(campaign.sent_at)} jours
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                                      {/* Status badges */}
                                      {campaign.response_detected_at ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                                          Répondu
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                          Pas de réponse
                                        </span>
                                      )}
                                      {campaign.follow_up_status === 'sent' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                          Relancé
                                        </span>
                                      )}
                                      {campaign.subject_type && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#27272a]/60 text-zinc-400 border border-white/[0.05] capitalize">
                                          {campaign.subject_type}
                                        </span>
                                      )}

                                      {/* Feedback buttons */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 rounded-lg ${campaign.user_feedback === 'positive' ? 'bg-green-500/20 text-green-400' : 'text-zinc-500 hover:text-green-400'}`}
                                        onClick={(e) => { e.stopPropagation(); handleSetFeedback(campaign.id, campaign.user_feedback === 'positive' ? '' : 'positive'); }}
                                        title="Réponse positive"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 rounded-lg ${campaign.user_feedback === 'negative' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                                        onClick={(e) => { e.stopPropagation(); handleSetFeedback(campaign.id, campaign.user_feedback === 'negative' ? '' : 'negative'); }}
                                        title="Réponse négative"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                      </Button>

                                      {/* Notes button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 rounded-lg ${campaign.feedback_notes ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'}`}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (feedbackNoteId === campaign.id) {
                                            setFeedbackNoteId(null);
                                          } else {
                                            setFeedbackNoteId(campaign.id);
                                            setFeedbackNoteText(campaign.feedback_notes || '');
                                          }
                                        }}
                                        title="Ajouter une note"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>

                                      {/* Exclude / re-include */}
                                      {isPending && canRelance && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); toggleExcludeFromRelance(campaign.id); }}
                                          className="h-7 w-7 p-0 rounded-lg text-zinc-500 hover:text-white"
                                        >
                                          {isExcluded ? (
                                            <RefreshCw className="h-3 w-3" />
                                          ) : (
                                            <MinusCircle className="h-3.5 w-3.5 text-red-400" />
                                          )}
                                        </Button>
                                      )}

                                      {/* Individual relance button */}
                                      {isPending && canRelance && !isExcluded && (
                                        <Button
                                          size="sm"
                                          className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                          onClick={(e) => { e.stopPropagation(); handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject); }}
                                        >
                                          <Send className="h-3 w-3 mr-1" />
                                          Relancer
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* AI Response summary */}
                                  {campaign.response_summary && (
                                    <div className="mt-2 p-2 rounded bg-[#18181b]/30 border border-[#27272a]">
                                      <p className="text-xs text-zinc-300">
                                        {responseTag && <span className={responseTag.className}>{responseTag.label} </span>}
                                        {campaign.response_summary}
                                      </p>
                                    </div>
                                  )}

                                  {/* Feedback note input */}
                                  {feedbackNoteId === campaign.id && (
                                    <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Textarea
                                        value={feedbackNoteText}
                                        onChange={(e) => setFeedbackNoteText(e.target.value)}
                                        placeholder="Pourquoi ça a marché/pas marché..."
                                        rows={2}
                                        className="text-xs bg-[#18181b]/30 border-white/10 text-white placeholder:text-zinc-600"
                                      />
                                      <Button size="sm" onClick={() => handleSaveFeedbackNote(campaign.id)} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                        OK
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Batch footer - relance button */}
                          {canRelance && (
                            <div className="pt-3 border-t border-white/[0.05]">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    className="w-full bg-white text-black hover:bg-gray-200 rounded-lg font-medium"
                                    disabled={activeCampaigns.length === 0 || relancingBatch === batch.id}
                                  >
                                    {relancingBatch === batch.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Relancer tout le batch ({activeCampaigns.length})
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Confirmer la relance</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                      Vous allez envoyer {activeCampaigns.length} relance{activeCampaigns.length > 1 ? 's' : ''}.
                                      <br /><br />
                                      <strong>Important :</strong> Avez-vous vérifié que vous n'avez pas reçu de réponses ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-[#27272a] border-white/10 text-white hover:bg-[#3f3f46]">Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRelanceBatch(batch)}
                                      className="bg-white text-black hover:bg-gray-200"
                                    >
                                      Confirmer et envoyer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUIVI TAB ================= */}
      {mainTab === 'suivi' && (
        <div className="space-y-6">
          {/* Suivi header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-white">📊 Tracking candidature</h3>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
              <button
                onClick={() => setPipelineView('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  pipelineView === 'list' 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                    : 'text-zinc-500 hover:text-white border border-transparent'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Liste</span>
              </button>
              <button
                onClick={() => setPipelineView('stats')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  pipelineView === 'stats' 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                    : 'text-zinc-500 hover:text-white border border-transparent'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Statistiques</span>
              </button>
            </div>
          </div>

          {/* ===== PIPELINE LIST VIEW ===== */}
          {pipelineView === 'list' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Rechercher par nom, ville, secteur..."
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                  className="pl-11 bg-[#18181b]/30 border-white/10 rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/30 text-white placeholder:text-zinc-500"
                />
                {pipelineSearch && (
                  <p className="text-xs text-zinc-500 mt-2 ml-1">
                    {filteredPipelineCompanies.length} résultat{filteredPipelineCompanies.length > 1 ? 's' : ''} sur {pipelineCompanies.length}
                  </p>
                )}
              </div>

              {/* Pipeline stages */}
              <div className="space-y-6">
                {PIPELINE_STAGES.map((stage) => {
                  const companiesInStage = filteredPipelineCompanies.filter(c => c.pipeline_stage === stage.value);
                  
                  return (
                    <div key={stage.value}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white text-base">{stage.label}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs bg-[#27272a]/60 text-zinc-400 border border-white/[0.05]">
                          {companiesInStage.length}
                        </span>
                      </div>
                      
                      {companiesInStage.length === 0 ? (
                        <div className="text-center py-4 rounded-xl bg-[#18181b]/30 border border-white/[0.05] border-dashed">
                          <p className="text-sm text-zinc-600">Aucune entreprise</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {companiesInStage.map(company => {
                            const currentStage = PIPELINE_STAGES.find(s => s.value === company.pipeline_stage);
                            const isUpdating = updatingCompany === company.id;
                            const isEntretien = company.pipeline_stage === 'entretien';
                            
                            return (
                              <div 
                                key={company.id} 
                                className={`p-3 rounded-xl border-l-4 ${currentStage?.colorClass} bg-[#27272a]/40 backdrop-blur-lg border-t border-r border-b border-white/[0.05] hover:bg-[#27272a]/60 hover:border-indigo-500/30 hover:translate-x-1 transition-all ${
                                  isEntretien ? 'bg-indigo-500/5' : ''
                                } ${isUpdating ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-semibold text-sm text-white">{company.nom}</h5>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                                      <span>📍 {company.ville}</span>
                                      {company.selected_email && (
                                        <>
                                          <span>·</span>
                                          <span className="truncate">{company.selected_email}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                                    <Select 
                                      value={company.pipeline_stage} 
                                      onValueChange={(value) => moveCompany(company.id, value)}
                                      disabled={isUpdating}
                                    >
                                      <SelectTrigger className="h-8 text-xs w-[160px] bg-[#18181b]/30 border-white/10 text-zinc-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08]">
                                        {PIPELINE_STAGES.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== STATS VIEW ===== */}
          {pipelineView === 'stats' && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total entreprises', value: pipelineStats.total, color: 'border-blue-500', textColor: 'text-blue-400' },
                  { label: 'Candidatures envoyées', value: pipelineStats.parPhase["candidature_envoyee"] || 0, color: 'border-purple-500', textColor: 'text-purple-400' },
                  { label: 'Entretiens', value: pipelineStats.parPhase["entretien"] || 0, color: 'border-indigo-500', textColor: 'text-indigo-400' },
                  { label: 'Acceptés', value: pipelineStats.parPhase["accepte"] || 0, color: 'border-emerald-500', textColor: 'text-emerald-400' },
                ].map((kpi) => (
                  <div key={kpi.label} className={`p-4 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] border-l-4 ${kpi.color} text-center`}>
                    <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                    <p className="text-xs text-zinc-500 mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="p-6 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
                  <h4 className="text-base font-semibold text-white mb-4">Répartition par phase</h4>
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-zinc-600">
                      Aucune donnée à afficher
                    </div>
                  )}
                </div>

                {/* Bar Chart */}
                <div className="p-6 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
                  <h4 className="text-base font-semibold text-white mb-4">Nombre par phase</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion rates */}
              {pipelineStats.total > 0 && (
                <div className="p-6 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
                  <h4 className="text-base font-semibold text-white mb-4">Taux de conversion</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="text-center p-4 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                      <p className="text-2xl font-bold text-blue-400">
                        {((pipelineStats.parPhase["candidature_envoyee"] || 0) / pipelineStats.total * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Taux d'envoi</p>
                    </div>
                    <div className="hidden sm:flex justify-center">
                      <ArrowRight className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div className="text-center p-4 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                      <p className="text-2xl font-bold text-indigo-400">
                        {pipelineStats.parPhase["candidature_envoyee"] 
                          ? ((pipelineStats.parPhase["entretien"] || 0) / pipelineStats.parPhase["candidature_envoyee"] * 100).toFixed(1)
                          : 0}%
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Envoi → Entretien</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center p-4 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                    <p className="text-2xl font-bold text-emerald-400">
                      {pipelineStats.parPhase["entretien"]
                        ? ((pipelineStats.parPhase["accepte"] || 0) / pipelineStats.parPhase["entretien"] * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Entretien → Accepté</p>
                  </div>
                </div>
              )}

              {/* Feedback performance */}
              {campaigns.length > 0 && (
                <div className="p-6 rounded-xl bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]">
                  <h4 className="text-base font-semibold text-white mb-4">📊 Performance par type d'approche</h4>
                  {(() => {
                    const withFeedback = campaigns.filter(c => c.user_feedback);
                    const typeLabels: Record<string, string> = { corporate: 'Corporate/RH', value: 'Valeur ajoutée', manager: 'Manager', question: 'Question' };
                    const toneLabels: Record<string, string> = { formal: 'Formel', balanced: 'Équilibré', direct: 'Direct', soft: 'Adouci' };
                    
                    const byType = Object.entries(typeLabels).map(([key, label]) => {
                      const ofType = withFeedback.filter(c => c.subject_type === key);
                      const positive = ofType.filter(c => c.user_feedback === 'positive').length;
                      return { name: label, total: ofType.length, positive, rate: ofType.length > 0 ? Math.round((positive / ofType.length) * 100) : 0 };
                    }).filter(d => d.total > 0);

                    const byTone = Object.entries(toneLabels).map(([key, label]) => {
                      const ofTone = withFeedback.filter(c => c.tone === key);
                      const positive = ofTone.filter(c => c.user_feedback === 'positive').length;
                      return { name: label, total: ofTone.length, positive, rate: ofTone.length > 0 ? Math.round((positive / ofTone.length) * 100) : 0 };
                    }).filter(d => d.total > 0);

                    const totalPositive = withFeedback.filter(c => c.user_feedback === 'positive').length;
                    const totalNegative = withFeedback.filter(c => c.user_feedback === 'negative').length;
                    const totalNoResponse = withFeedback.filter(c => c.user_feedback === 'no_response').length;

                    if (withFeedback.length === 0) {
                      return <p className="text-sm text-zinc-500 text-center py-4">Ajoutez des feedbacks sur vos emails pour voir les statistiques.</p>;
                    }

                    const feedbackPieData = [
                      { name: 'Positif', value: totalPositive, color: '#22c55e' },
                      { name: 'Négatif', value: totalNegative, color: '#ef4444' },
                      { name: 'Sans réponse', value: totalNoResponse, color: '#94a3b8' },
                    ].filter(d => d.value > 0);

                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                            <p className="text-2xl font-bold text-green-400">{totalPositive}</p>
                            <p className="text-xs text-zinc-500">Positifs</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                            <p className="text-2xl font-bold text-red-400">{totalNegative}</p>
                            <p className="text-xs text-zinc-500">Négatifs</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-[#27272a]/40 border border-white/[0.05]">
                            <p className="text-2xl font-bold text-zinc-400">{totalNoResponse}</p>
                            <p className="text-xs text-zinc-500">Sans réponse</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-zinc-300 mb-3">Répartition feedbacks</h5>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={feedbackPieData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                                  {feedbackPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {byType.length > 0 && (
                            <div>
                              <h5 className="font-medium text-zinc-300 mb-3">Taux positif par type</h5>
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={byType} layout="vertical">
                                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#71717a', fontSize: 12 }} />
                                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                                  <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                        {byTone.length > 0 && (
                          <div>
                            <h5 className="font-medium text-zinc-300 mb-3">Taux positif par ton</h5>
                            <ResponsiveContainer width="100%" height={160}>
                              <BarChart data={byTone} layout="vertical">
                                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#71717a', fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                                <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
