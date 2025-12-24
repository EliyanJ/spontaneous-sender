import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Clock, CheckCircle, XCircle, AlertCircle, Send } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  pipeline_stage: string | null;
}

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [followUpDelay, setFollowUpDelay] = useState(10);

  useEffect(() => {
    loadUserPreferences();
    loadCampaigns();

    // Recharger toutes les minutes
    const interval = setInterval(loadCampaigns, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('follow_up_delay_days')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFollowUpDelay(data.follow_up_delay_days || 10);
      }
    } catch (error) {
      console.error('Erreur chargement préférences:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

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

      const { data, error } = await query;
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysSinceSent = (sentAt: string) => {
    const sent = new Date(sentAt);
    const now = new Date();
    const diff = now.getTime() - sent.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const isUrgentFollowUp = (campaign: Campaign) => {
    if (campaign.follow_up_status !== 'pending' || campaign.response_detected_at) return false;
    const daysSinceSent = getDaysSinceSent(campaign.sent_at);
    return daysSinceSent >= followUpDelay;
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

      const followUpBody = `
        Bonjour,
        
        Je me permets de revenir vers vous concernant ma candidature spontanée.
        
        Je reste disponible pour échanger sur les opportunités au sein de votre entreprise.
        
        Cordialement
      `;

      const { error } = await supabase.functions.invoke('send-gmail-emails', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          recipients: [recipient],
          subject: `Relance: ${originalSubject}`,
          body: followUpBody,
        },
      });

      if (error) throw error;

      // Mettre à jour le statut
      await supabase
        .from('email_campaigns')
        .update({
          follow_up_status: 'sent',
          follow_up_sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      toast({
        title: "Relance envoyée",
        description: `La relance a été envoyée à ${recipient}`,
      });

      loadCampaigns();
    } catch (error: any) {
      console.error('Error sending follow-up:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la relance.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCampaigns = campaigns.filter(c => 
    c.follow_up_status === 'pending' && !c.response_detected_at
  );

  const respondedCampaigns = campaigns.filter(c => c.response_detected_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Campagnes & Relances</h2>
        <Button onClick={loadCampaigns} variant="outline" size="sm">
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Relances à faire ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="responded">
            Réponses ({respondedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune campagne d'email pour le moment
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.recipient}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      </div>
                      {campaign.response_category && getCategoryBadge(campaign.response_category)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Envoyé il y a {getDaysSinceSent(campaign.sent_at)} jours</span>
                      {campaign.response_detected_at && (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Réponse reçue
                        </Badge>
                      )}
                    </div>

                    {campaign.response_summary && (
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <p className="font-medium mb-1">Résumé de la réponse:</p>
                        <p>{campaign.response_summary}</p>
                      </div>
                    )}

                    {!campaign.response_detected_at && 
                     campaign.follow_up_status === 'pending' && 
                     getDaysSinceSent(campaign.sent_at) >= followUpDelay && (
                      <div className="pt-3 border-t">
                        <Button
                          onClick={() => handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject)}
                          size="sm"
                          variant="outline"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer une relance
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingCampaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune relance à faire</p>
                <p className="text-sm mt-2">Les campagnes nécessitant une relance apparaîtront ici</p>
              </CardContent>
            </Card>
          ) : (
            pendingCampaigns.map((campaign) => {
              const daysSince = getDaysSinceSent(campaign.sent_at);
              const isUrgent = daysSince >= followUpDelay;
              
              return (
                <Card key={campaign.id} className={isUrgent ? 'border-orange-500/50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium">{campaign.recipient}</span>
                          {isUrgent && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Urgent - {daysSince} jours
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Envoyé il y a {daysSince} jours
                          </span>
                          {campaign.pipeline_stage && (
                            <Badge variant="outline" className="text-xs">
                              {campaign.pipeline_stage}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSendFollowUp(campaign.id, campaign.recipient, campaign.subject)}
                        size="sm"
                        variant={isUrgent ? "default" : "outline"}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Relancer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="responded" className="space-y-4">
          {respondedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune réponse pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            respondedCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium">{campaign.recipient}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      </div>
                      {getCategoryBadge(campaign.response_category)}
                    </div>
                    {campaign.response_summary && (
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <p>{campaign.response_summary}</p>
                      </div>
                    )}
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
