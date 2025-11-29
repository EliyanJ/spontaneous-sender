import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { 
  User, Bell, LogOut, Mail, Loader2, Save, 
  RefreshCw, CheckCircle, AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Notifications } from "./Notifications";

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

export const Settings = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'preferences'>('profile');
  
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

      // Check Gmail connection
      const { data: gmailData } = await supabase
        .from('gmail_tokens')
        .select('id')
        .maybeSingle();
      setGmailConnected(!!gmailData);

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
                  <div className="flex items-center gap-3 mt-1.5">
                    {gmailConnected ? (
                      <>
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Connecté
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Vous pouvez envoyer des emails
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Non connecté
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            sessionStorage.setItem('post_login_redirect', '/dashboard?tab=settings');
                            window.location.href = '/auth';
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
