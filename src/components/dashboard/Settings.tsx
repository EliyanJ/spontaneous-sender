import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  User, Bell, LogOut, Mail, Loader2, Save, 
  RefreshCw, CheckCircle, AlertCircle, CreditCard, Zap, Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Notifications } from "./Notifications";
import { STRIPE_PRODUCTS, FREE_PLAN } from "@/lib/stripe-config";

interface UserProfile {
  full_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
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
  const [gmailConnected, setGmailConnected] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'subscription' | 'notifications' | 'preferences'>('profile');
  
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    linkedin_url: '',
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

  // Check for Gmail refresh parameter and listen for gmail-connected event
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const checkGmailStatus = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (showDebug) {
        setDebugInfo(`User ID: ${userId || 'none'}`);
      }
      
      if (!userId) {
        console.log('[Settings] No user session, cannot check Gmail tokens');
        setGmailConnected(false);
        return;
      }
      
      const { data: gmailData, error } = await supabase
        .from('gmail_tokens')
        .select('id, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (showDebug) {
        setDebugInfo(prev => `${prev}\nGmail query: ${gmailData ? 'found' : 'not found'} ${error ? `(err: ${error.message})` : ''}`);
      }
      
      console.log('[Settings] Gmail check result:', { found: !!gmailData, error });
      setGmailConnected(!!gmailData);
    };
    
    if (params.get('gmailRefresh') === 'true') {
      params.delete('gmailRefresh');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
      // Force reload Gmail status
      checkGmailStatus();
    }

    const handleGmailConnected = () => {
      checkGmailStatus();
    };

    window.addEventListener('gmail-connected', handleGmailConnected);
    return () => window.removeEventListener('gmail-connected', handleGmailConnected);
  }, [showDebug]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone, linkedin_url')
        .single();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          linkedin_url: profileData.linkedin_url || '',
        });
      }

      // Load preferences
      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('*')
        .single();

      if (prefData) {
        setPreferences({
          notify_on_response: prefData.notify_on_response ?? true,
          notify_on_follow_up_reminder: prefData.notify_on_follow_up_reminder ?? true,
          notify_on_email_sent: prefData.notify_on_email_sent ?? false,
          follow_up_delay_days: prefData.follow_up_delay_days ?? 10,
          auto_follow_up: prefData.auto_follow_up ?? false,
        });
      }

      // Check Gmail connection (RLS-safe: query by session user_id)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        setGmailConnected(false);
      } else {
        const { data: gmailData, error: gmailError } = await supabase
          .from('gmail_tokens')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (gmailError) {
          console.warn('[Settings] Gmail token check error:', gmailError);
        }

        setGmailConnected(!!gmailData);
      }


      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan_type, sends_remaining, sends_limit, tokens_remaining, current_period_end')
        .single();

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast({ title: "Profil sauvegardé" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
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
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre profil et vos préférences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-2">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === 'profile' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Profil
                </button>
                <button
                  onClick={() => setActiveSection('subscription')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === 'subscription' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Abonnement
                </button>
                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === 'notifications' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveSection('preferences')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === 'preferences' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Préférences
                </button>
              </nav>

              <Separator className="my-4" />

              <Button
                variant="ghost"
                onClick={signOut}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Déconnexion
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profil utilisateur
                </CardTitle>
                <CardDescription>
                  Vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email (readonly) */}
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input value={user?.email || ''} disabled className="bg-muted" />
                    <Badge variant="outline">Connecté</Badge>
                  </div>
                </div>

                {/* Gmail Status */}
                <div>
                  <Label className="text-muted-foreground">Connexion Gmail</Label>
                  <div className="flex flex-col gap-3 mt-1.5">
                    {gmailConnected ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Connecté
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Vous pouvez envoyer des emails
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              // Supprimer les tokens Gmail existants puis rediriger vers /connect-gmail
                              await supabase.from('gmail_tokens').delete().eq('user_id', user?.id);
                              window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=settings');
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reconnecter Gmail
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            (si vos tokens ont expiré)
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Non connecté
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-fit"
                          onClick={() => {
                            window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=settings');
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Connecter Gmail
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Profile fields */}
                <div>
                  <Label htmlFor="full_name" className="text-muted-foreground">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Votre nom"
                    className="mt-1.5 bg-background"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-muted-foreground">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+33 6 00 00 00 00"
                    className="mt-1.5 bg-background"
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin" className="text-muted-foreground">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={profile.linkedin_url || ''}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="mt-1.5 bg-background"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'subscription' && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Mon abonnement
                </CardTitle>
                <CardDescription>
                  Gérez votre plan et vos crédits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {subscription.plan_type === 'plus' ? (
                      <Crown className="h-6 w-6 text-yellow-500" />
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

                {/* Credits */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Crédits mensuels</Label>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Envois restants</span>
                      <span className="font-medium">{subscription.sends_remaining} / {subscription.sends_limit}</span>
                    </div>
                    <Progress value={(subscription.sends_remaining / subscription.sends_limit) * 100} />
                  </div>
                </div>

                {subscription.tokens_remaining > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Tokens bonus:</span> {subscription.tokens_remaining} crédits
                    </p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => navigate('/pricing')}>
                  Acheter des crédits supplémentaires
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Notifications />
          )}

          {activeSection === 'preferences' && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Préférences
                </CardTitle>
                <CardDescription>
                  Configurez le comportement de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification preferences */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Notifications</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Réponses reçues</p>
                      <p className="text-xs text-muted-foreground">Être notifié lors d'une réponse</p>
                    </div>
                    <Switch
                      checked={preferences.notify_on_response}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, notify_on_response: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Rappels de relance</p>
                      <p className="text-xs text-muted-foreground">Être rappelé pour les relances</p>
                    </div>
                    <Switch
                      checked={preferences.notify_on_follow_up_reminder}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, notify_on_follow_up_reminder: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Emails envoyés</p>
                      <p className="text-xs text-muted-foreground">Confirmation d'envoi</p>
                    </div>
                    <Switch
                      checked={preferences.notify_on_email_sent}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, notify_on_email_sent: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Follow-up settings */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Relances</Label>

                  <div>
                    <Label htmlFor="delay" className="text-muted-foreground">Délai avant relance (jours)</Label>
                    <Input
                      id="delay"
                      type="number"
                      min={1}
                      max={30}
                      value={preferences.follow_up_delay_days}
                      onChange={(e) => setPreferences({ ...preferences, follow_up_delay_days: parseInt(e.target.value) || 10 })}
                      className="mt-1.5 bg-background w-32"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Relances automatiques</p>
                      <p className="text-xs text-muted-foreground">Envoyer automatiquement les relances</p>
                    </div>
                    <Switch
                      checked={preferences.auto_follow_up}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, auto_follow_up: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
