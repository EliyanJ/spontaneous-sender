import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Mail, Clock, AlertCircle, Send, 
  Calendar, Trash2, RefreshCw, Settings2, ChevronDown, ChevronUp, X,
  Search, BarChart3, List, TrendingUp, ThumbsUp, ThumbsDown, MinusCircle, MessageSquare
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

  // Helper functions - defined before useMemo hooks that use them
  const getDaysSinceSent = (sentAt: string) => {
    const diff = new Date().getTime() - new Date(sentAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Group campaigns into batches
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

  // Filter batches by search
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return campaignBatches;
    const query = searchQuery.toLowerCase();
    return campaignBatches.filter(batch => 
      batch.subject.toLowerCase().includes(query) ||
      batch.campaigns.some(c => c.recipient.toLowerCase().includes(query))
    );
  }, [campaignBatches, searchQuery]);

  // Get batches with pending relances (also filtered)
  const batchesWithPendingRelances = useMemo(() => {
    return filteredBatches.filter(batch => {
      const daysSince = getDaysSinceSent(batch.timestamp);
      return daysSince >= followUpDelay && batch.campaigns.some(c => 
        c.follow_up_status === 'pending' && !c.response_detected_at
      );
    });
  }, [filteredBatches, followUpDelay]);

  // Pipeline filtered companies
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

  // Pipeline chart data
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Campagnes</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos campagnes, relances et suivi des candidatures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Paramètres</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Délai avant relance</Label>
                  <Select 
                    value={followUpDelay.toString()} 
                    onValueChange={(v) => updateFollowUpDelay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs: Campagnes / Suivi */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Send className="h-4 w-4" />
            Campagnes
          </TabsTrigger>
          <TabsTrigger value="suivi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <TrendingUp className="h-4 w-4" />
            Suivi
          </TabsTrigger>
        </TabsList>

        {/* === CAMPAGNES TAB === */}
        <TabsContent value="campaigns" className="mt-6 space-y-6">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par sujet ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Disclaimer for relances */}
          {batchesWithPendingRelances.length > 0 && (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {batchesWithPendingRelances.length} campagne{batchesWithPendingRelances.length > 1 ? 's' : ''} à relancer
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vérifiez que vous n'avez pas reçu de réponses avant de relancer. 
                      Vous pouvez exclure des entreprises en cliquant sur le ✕.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign batches */}
          {filteredBatches.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Aucune campagne trouvée" : "Aucune campagne"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => {
                const daysSince = getDaysSinceSent(batch.timestamp);
                const pendingCampaigns = batch.campaigns.filter(c => 
                  c.follow_up_status === 'pending' && !c.response_detected_at
                );
                const activeCampaigns = pendingCampaigns.filter(c => !excludedFromRelance.has(c.id));
                const canRelance = daysSince >= followUpDelay && pendingCampaigns.length > 0;

                return (
                  <Card key={batch.id} className={`bg-card/50 ${canRelance ? 'border-warning/30' : ''}`}>
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground truncate">{batch.subject}</span>
                            <Badge variant="secondary">{batch.campaigns.length} email{batch.campaigns.length > 1 ? 's' : ''}</Badge>
                            {canRelance && (
                              <Badge variant="destructive" className="text-xs">
                                À relancer ({daysSince}j)
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(batch.timestamp).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canRelance && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  disabled={activeCampaigns.length === 0 || relancingBatch === batch.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {relancingBatch === batch.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-1" />
                                  )}
                                  Relancer
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmer la relance</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Vous allez envoyer {activeCampaigns.length} relance{activeCampaigns.length > 1 ? 's' : ''}.
                                    <br /><br />
                                    <strong>Important :</strong> Avez-vous vérifié que vous n'avez pas reçu de réponses ?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRelanceBatch(batch)}>
                                    Confirmer et envoyer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {expandedBatch === batch.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {expandedBatch === batch.id && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {batch.campaigns.map((campaign) => {
                            const isExcluded = excludedFromRelance.has(campaign.id);
                            const isPending = campaign.follow_up_status === 'pending' && !campaign.response_detected_at;
                            return (
                              <div 
                                key={campaign.id} 
                                className={`p-3 rounded-md ${
                                  isExcluded ? 'bg-muted/20 opacity-50' : 'bg-muted/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className={`text-sm truncate ${isExcluded ? 'line-through' : ''}`}>
                                      {campaign.recipient}
                                    </span>
                                    {campaign.subject_type && (
                                      <Badge variant="outline" className="text-xs capitalize">{campaign.subject_type}</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Feedback buttons */}
                                    <Button
                                      variant={campaign.user_feedback === 'positive' ? 'default' : 'ghost'}
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => { e.stopPropagation(); handleSetFeedback(campaign.id, campaign.user_feedback === 'positive' ? '' : 'positive'); }}
                                      title="Réponse positive"
                                    >
                                      <ThumbsUp className={`h-3.5 w-3.5 ${campaign.user_feedback === 'positive' ? '' : 'text-emerald-500'}`} />
                                    </Button>
                                    <Button
                                      variant={campaign.user_feedback === 'negative' ? 'destructive' : 'ghost'}
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => { e.stopPropagation(); handleSetFeedback(campaign.id, campaign.user_feedback === 'negative' ? '' : 'negative'); }}
                                      title="Réponse négative"
                                    >
                                      <ThumbsDown className={`h-3.5 w-3.5 ${campaign.user_feedback === 'negative' ? '' : 'text-red-500'}`} />
                                    </Button>
                                    <Button
                                      variant={campaign.user_feedback === 'no_response' ? 'secondary' : 'ghost'}
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => { e.stopPropagation(); handleSetFeedback(campaign.id, campaign.user_feedback === 'no_response' ? '' : 'no_response'); }}
                                      title="Pas de réponse"
                                    >
                                      <MinusCircle className={`h-3.5 w-3.5 ${campaign.user_feedback === 'no_response' ? '' : 'text-muted-foreground'}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
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
                                      <MessageSquare className={`h-3.5 w-3.5 ${campaign.feedback_notes ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </Button>

                                    {campaign.response_detected_at && (
                                      <Badge variant="outline" className="text-xs ml-1">Répondu</Badge>
                                    )}
                                    {campaign.follow_up_status === 'sent' && (
                                      <Badge variant="secondary" className="text-xs">Relancé</Badge>
                                    )}
                                    {isPending && canRelance && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExcludeFromRelance(campaign.id);
                                        }}
                                        className="h-6 w-6 p-0"
                                      >
                                        {isExcluded ? (
                                          <RefreshCw className="h-3 w-3" />
                                        ) : (
                                          <X className="h-3 w-3 text-destructive" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {/* Feedback note input */}
                                {feedbackNoteId === campaign.id && (
                                  <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Textarea
                                      value={feedbackNoteText}
                                      onChange={(e) => setFeedbackNoteText(e.target.value)}
                                      placeholder="Pourquoi ça a marché/pas marché..."
                                      rows={2}
                                      className="text-xs"
                                    />
                                    <Button size="sm" onClick={() => handleSaveFeedbackNote(campaign.id)} className="shrink-0">
                                      OK
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Scheduled Emails Section */}
          {scheduledEmails.length > 0 && (
            <div className="space-y-3 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Emails programmés ({scheduledEmails.length})
              </h3>
              {scheduledEmails.map((email) => (
                <Card key={email.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-medium">{email.subject}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {email.recipients.join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeUntilSend(email.scheduled_for)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(email.scheduled_for).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={cancelling === email.id}>
                            {cancelling === email.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Annuler l'email ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              L'email "{email.subject}" ne sera pas envoyé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Retour</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelScheduled(email.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Annuler l'email
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === SUIVI TAB === */}
        <TabsContent value="suivi" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-background">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-xl">📊 Tracking candidature</CardTitle>
                <Tabs value={pipelineView} onValueChange={(v) => setPipelineView(v as "list" | "stats")}>
                  <TabsList>
                    <TabsTrigger value="list" className="gap-2">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">Liste</span>
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Statistiques</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {pipelineView === "list" && (
                <>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom, ville, secteur..."
                        value={pipelineSearch}
                        onChange={(e) => setPipelineSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {pipelineSearch && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {filteredPipelineCompanies.length} résultat{filteredPipelineCompanies.length > 1 ? 's' : ''} sur {pipelineCompanies.length}
                      </p>
                    )}
                  </div>

                  {/* Pipeline Stages */}
                  <div className="space-y-6">
                    {PIPELINE_STAGES.map((stage) => {
                      const companiesInStage = filteredPipelineCompanies.filter(c => c.pipeline_stage === stage.value);
                      
                      return (
                        <div key={stage.value}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{stage.label}</h3>
                            <span className="text-sm font-bold text-muted-foreground">
                              {companiesInStage.length} entreprise{companiesInStage.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {companiesInStage.length === 0 ? (
                            <div className="text-center py-4 bg-muted/30 rounded-lg">
                              <p className="text-sm text-muted-foreground">Aucune entreprise</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {companiesInStage.map(company => {
                                const currentStage = PIPELINE_STAGES.find(s => s.value === company.pipeline_stage);
                                const isUpdating = updatingCompany === company.id;
                                
                                return (
                                  <Card 
                                    key={company.id} 
                                    className={`mb-2 hover:shadow-md transition-shadow border-l-4 ${currentStage?.colorClass} ${isUpdating ? 'opacity-60' : ''}`}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-sm">{company.nom}</h4>
                                        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">📍 {company.ville}</p>
                                      
                                      {company.selected_email && (
                                        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate">{company.selected_email}</span>
                                        </div>
                                      )}
                                      
                                      <Select 
                                        value={company.pipeline_stage} 
                                        onValueChange={(value) => moveCompany(company.id, value)}
                                        disabled={isUpdating}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PIPELINE_STAGES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                              {s.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {pipelineView === "stats" && (
                <div className="space-y-8">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-primary">{pipelineStats.total}</p>
                        <p className="text-sm text-muted-foreground">Total entreprises</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-purple-500">
                          {pipelineStats.parPhase["candidature_envoyee"] || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Candidatures envoyées</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-indigo-500">
                          {pipelineStats.parPhase["entretien"] || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Entretiens</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-emerald-500">
                          {pipelineStats.parPhase["accepte"] || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Acceptés</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Répartition par phase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {pieChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={false}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Aucune donnée à afficher
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bar Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Nombre par phase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={barChartData} layout="vertical">
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Conversion Rates */}
                  {pipelineStats.total > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Taux de conversion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <p className="text-2xl font-bold text-primary">
                              {((pipelineStats.parPhase["candidature_envoyee"] || 0) / pipelineStats.total * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Taux d'envoi</p>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <p className="text-2xl font-bold text-indigo-500">
                              {pipelineStats.parPhase["candidature_envoyee"] 
                                ? ((pipelineStats.parPhase["entretien"] || 0) / pipelineStats.parPhase["candidature_envoyee"] * 100).toFixed(1)
                                : 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Envoi → Entretien</p>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <p className="text-2xl font-bold text-emerald-500">
                              {pipelineStats.parPhase["entretien"]
                                ? ((pipelineStats.parPhase["accepte"] || 0) / pipelineStats.parPhase["entretien"] * 100).toFixed(1)
                                : 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Entretien → Accepté</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Feedback Performance by Type */}
                  {campaigns.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">📊 Performance par type d'approche</CardTitle>
                      </CardHeader>
                      <CardContent>
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
                            return <p className="text-sm text-muted-foreground text-center py-4">Ajoutez des feedbacks sur vos emails pour voir les statistiques.</p>;
                          }

                          const feedbackPieData = [
                            { name: 'Positif', value: totalPositive, color: '#22c55e' },
                            { name: 'Négatif', value: totalNegative, color: '#ef4444' },
                            { name: 'Sans réponse', value: totalNoResponse, color: '#94a3b8' },
                          ].filter(d => d.value > 0);

                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <p className="text-2xl font-bold text-emerald-500">{totalPositive}</p>
                                  <p className="text-xs text-muted-foreground">Positifs</p>
                                </div>
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <p className="text-2xl font-bold text-red-500">{totalNegative}</p>
                                  <p className="text-xs text-muted-foreground">Négatifs</p>
                                </div>
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <p className="text-2xl font-bold text-muted-foreground">{totalNoResponse}</p>
                                  <p className="text-xs text-muted-foreground">Sans réponse</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-medium mb-3">Répartition feedbacks</h4>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                      <Pie data={feedbackPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                                        {feedbackPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                      </Pie>
                                      <Tooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                                {byType.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-3">Taux positif par type</h4>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <BarChart data={byType} layout="vertical">
                                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v: number) => `${v}%`} />
                                        <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                              {byTone.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3">Taux positif par ton</h4>
                                  <ResponsiveContainer width="100%" height={160}>
                                    <BarChart data={byTone} layout="vertical">
                                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                      <Tooltip formatter={(v: number) => `${v}%`} />
                                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
