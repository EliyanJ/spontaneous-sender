import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Mail, Clock, CheckCircle, XCircle, AlertCircle, Send, 
  Calendar, Trash2, RefreshCw 
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

export const CampaignsHub = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded' | 'scheduled'>('all');
  const [followUpDelay, setFollowUpDelay] = useState(10);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load preferences
      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('follow_up_delay_days')
        .eq('user_id', user.id)
        .single();
      if (prefData) setFollowUpDelay(prefData.follow_up_delay_days || 10);

      // Load campaigns - filter by user_id explicitly
      let query = supabase
        .from('email_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('follow_up_status', 'pending').is('response_detected_at', null);
      } else if (filter === 'responded') {
        query = query.not('response_detected_at', 'is', null);
      }

      const { data: campaignsData } = await query;
      setCampaigns(campaignsData || []);

      // Load scheduled emails - filter by user_id explicitly
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

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    const variants = {
      positive: { variant: 'default' as const, icon: CheckCircle, label: 'Positif' },
      negative: { variant: 'destructive' as const, icon: XCircle, label: 'Négatif' },
      neutral: { variant: 'secondary' as const, icon: AlertCircle, label: 'Neutre' },
      request_info: { variant: 'outline' as const, icon: Mail, label: 'Info demandée' },
    };
    const config = variants[category as keyof typeof variants];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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

  const pendingCampaigns = campaigns.filter(c => c.follow_up_status === 'pending' && !c.response_detected_at);
  const respondedCampaigns = campaigns.filter(c => c.response_detected_at);

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
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="bg-card/50 border border-border overflow-x-auto scrollbar-hide flex w-full">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Toutes <span className="hidden sm:inline">({campaigns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Relances <span className="hidden sm:inline">({pendingCampaigns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="responded" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Réponses <span className="hidden sm:inline">({respondedCampaigns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
            Programmés <span className="hidden sm:inline">({scheduledEmails.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* All Campaigns */}
        <TabsContent value="all" className="mt-6 space-y-3">
          {campaigns.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune campagne</p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">{campaign.recipient}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{campaign.subject}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Envoyé il y a {getDaysSinceSent(campaign.sent_at)} jours</span>
                        {campaign.response_detected_at && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Réponse
                          </Badge>
                        )}
                      </div>
                      {campaign.response_summary && (
                        <div className="bg-muted/50 p-3 rounded-md text-sm mt-3">
                          {campaign.response_summary}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {campaign.response_category && getCategoryBadge(campaign.response_category)}
                      {!campaign.response_detected_at && 
                       campaign.follow_up_status === 'pending' && 
                       getDaysSinceSent(campaign.sent_at) >= followUpDelay && (
                        <Button
                          onClick={() => handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject)}
                          size="sm"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Relancer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Follow-ups */}
        <TabsContent value="pending" className="mt-6 space-y-3">
          {pendingCampaigns.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune relance à faire</p>
              </CardContent>
            </Card>
          ) : (
            pendingCampaigns.map((campaign) => {
              const daysSince = getDaysSinceSent(campaign.sent_at);
              const isUrgent = daysSince >= followUpDelay;
              
              return (
                <Card key={campaign.id} className={`bg-card/50 ${isUrgent ? 'border-warning/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{campaign.recipient}</span>
                          {isUrgent && (
                            <Badge variant="destructive" className="gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />
                              {daysSince} jours
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{campaign.subject}</p>
                      </div>
                      <Button
                        onClick={() => handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject)}
                        size="sm"
                        variant={isUrgent ? "default" : "outline"}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Relancer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Responses */}
        <TabsContent value="responded" className="mt-6 space-y-3">
          {respondedCampaigns.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune réponse</p>
              </CardContent>
            </Card>
          ) : (
            respondedCampaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campaign.recipient}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{campaign.subject}</p>
                      {campaign.response_summary && (
                        <div className="bg-muted/50 p-3 rounded-md text-sm mt-3">
                          {campaign.response_summary}
                        </div>
                      )}
                    </div>
                    {getCategoryBadge(campaign.response_category)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Scheduled */}
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
                            Annuler
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
