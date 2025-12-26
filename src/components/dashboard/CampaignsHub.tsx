import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Mail, Clock, AlertCircle, Send, 
  Calendar, Trash2, RefreshCw, Settings2, ChevronDown, ChevronUp, X
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

export const CampaignsHub = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'campaigns' | 'relances' | 'scheduled'>('campaigns');
  const [followUpDelay, setFollowUpDelay] = useState(10);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [excludedFromRelance, setExcludedFromRelance] = useState<Set<string>>(new Set());
  const [relancingBatch, setRelancingBatch] = useState<string | null>(null);

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

    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Group campaigns into batches (emails sent within 5 minutes of each other with same subject)
  const campaignBatches = useMemo(() => {
    const batches: CampaignBatch[] = [];
    const sortedCampaigns = [...campaigns].sort((a, b) => 
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );

    sortedCampaigns.forEach(campaign => {
      const campaignTime = new Date(campaign.sent_at).getTime();
      
      // Try to find an existing batch within 5 minutes with same subject
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

  const getDaysSinceSent = (sentAt: string) => {
    const diff = new Date().getTime() - new Date(sentAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

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

  // Get batches that have pending follow-ups
  const batchesWithPendingRelances = useMemo(() => {
    return campaignBatches.filter(batch => {
      const daysSince = getDaysSinceSent(batch.timestamp);
      return daysSince >= followUpDelay && batch.campaigns.some(c => 
        c.follow_up_status === 'pending' && !c.response_detected_at
      );
    });
  }, [campaignBatches, followUpDelay]);

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
            Gérez vos campagnes, relances et emails programmés
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

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="bg-card/50 border border-border overflow-x-auto scrollbar-hide flex w-full">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Campagnes <span className="hidden sm:inline">({campaignBatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="relances" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Relances <span className="hidden sm:inline">({batchesWithPendingRelances.length})</span>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Programmés <span className="hidden sm:inline">({scheduledEmails.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6 space-y-3">
          {campaignBatches.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune campagne</p>
              </CardContent>
            </Card>
          ) : (
            campaignBatches.map((batch) => (
              <Card key={batch.id} className="bg-card/50">
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
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(batch.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {expandedBatch === batch.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {expandedBatch === batch.id && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      {batch.campaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{campaign.recipient}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {campaign.response_detected_at && (
                              <Badge variant="outline" className="text-xs">Répondu</Badge>
                            )}
                            {campaign.follow_up_status === 'sent' && (
                              <Badge variant="secondary" className="text-xs">Relancé</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Relances Tab */}
        <TabsContent value="relances" className="mt-6 space-y-3">
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Avant de relancer</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vérifiez que vous n'avez pas reçu de réponses dans votre boîte mail. 
                    Vous pouvez exclure des entreprises de la relance en cliquant sur le ✕ à côté de chaque email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {batchesWithPendingRelances.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune relance à faire</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Les relances apparaissent après {followUpDelay} jours
                </p>
              </CardContent>
            </Card>
          ) : (
            batchesWithPendingRelances.map((batch) => {
              const pendingCampaigns = batch.campaigns.filter(c => 
                c.follow_up_status === 'pending' && !c.response_detected_at
              );
              const activeCampaigns = pendingCampaigns.filter(c => !excludedFromRelance.has(c.id));
              const daysSince = getDaysSinceSent(batch.timestamp);

              return (
                <Card key={batch.id} className="bg-card/50 border-warning/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{batch.subject}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="destructive" className="text-xs">
                            {daysSince} jours
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {activeCampaigns.length} relance{activeCampaigns.length > 1 ? 's' : ''} à envoyer
                          </span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            disabled={activeCampaigns.length === 0 || relancingBatch === batch.id}
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
                              Si une entreprise vous a répondu, excluez-la de la relance.
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
                    </div>

                    <div className="space-y-2">
                      {pendingCampaigns.map((campaign) => {
                        const isExcluded = excludedFromRelance.has(campaign.id);
                        return (
                          <div 
                            key={campaign.id} 
                            className={`flex items-center justify-between p-2 rounded-md ${
                              isExcluded ? 'bg-muted/20 opacity-50' : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className={`text-sm truncate ${isExcluded ? 'line-through' : ''}`}>
                                {campaign.recipient}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExcludeFromRelance(campaign.id)}
                              className="shrink-0 h-6 w-6 p-0"
                            >
                              {isExcluded ? (
                                <RefreshCw className="h-3 w-3" />
                              ) : (
                                <X className="h-3 w-3 text-destructive" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="mt-6 space-y-3">
          {scheduledEmails.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucun email programmé</p>
              </CardContent>
            </Card>
          ) : (
            scheduledEmails.map((email) => (
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
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
