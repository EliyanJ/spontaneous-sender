import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Mail, Save, Upload, X, Plus, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface CompanyEmail {
  id: string;
  nom: string;
  selected_email: string;
  siren: string;
}

export const EmailComposer = () => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [companies, setCompanies] = useState<CompanyEmail[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingGmail, setCheckingGmail] = useState(true);
  const [syncingHistory, setSyncingHistory] = useState(false);
  
  // Nouveaux états pour la programmation d'emails
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notifyOnSent, setNotifyOnSent] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCompanies();
    checkGmailConnection();

    // Écouter les mises à jour des entreprises
    const handleCompaniesUpdate = () => {
      loadCompanies();
    };
    window.addEventListener('companies:updated', handleCompaniesUpdate);

    return () => {
      window.removeEventListener('companies:updated', handleCompaniesUpdate);
    };
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    setTemplates(data || []);
  };

  const loadCompanies = async () => {
    // Récupérer les emails déjà contactés via email_campaigns
    const { data: campaignsData } = await supabase
      .from("email_campaigns")
      .select("recipient");
    
    const contactedEmails = new Set(
      (campaignsData || []).map(c => c.recipient.toLowerCase())
    );

    // Récupérer les SIRENs des entreprises blacklistées
    const { data: blacklistData } = await supabase
      .from("user_company_blacklist")
      .select("company_siren");
    
    const blacklistedSirens = new Set(
      (blacklistData || []).map(b => b.company_siren)
    );

    // Récupérer les entreprises avec email
    const { data, error } = await supabase
      .from("companies")
      .select("id, nom, selected_email, siren")
      .not("selected_email", "is", null);

    if (error) {
      console.error("Error loading companies:", error);
      return;
    }

    // Filtrer les entreprises déjà contactées (via email ou via blacklist)
    const filteredCompanies = (data || []).filter(company => 
      !contactedEmails.has(company.selected_email.toLowerCase()) &&
      !blacklistedSirens.has(company.siren)
    );

    setCompanies(filteredCompanies);
  };

  const checkGmailConnection = async () => {
    try {
      setCheckingGmail(true);
      const { data } = await supabase
        .from("gmail_tokens")
        .select("id")
        .maybeSingle();
      setGmailConnected(!!data);
    } catch (e) {
      console.error("Error checking Gmail connection:", e);
    } finally {
      setCheckingGmail(false);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setSelectedTemplate(templateId);
      toast({
        title: "Template chargé",
        description: `Le template "${template.name}" a été chargé.`,
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !subject.trim() || !body.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs du template.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTemplate(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder un template.",
        variant: "destructive",
      });
      setIsSavingTemplate(false);
      return;
    }

    const { error } = await supabase.from("email_templates").insert([{
      user_id: user.id,
      name: newTemplateName,
      subject,
      body,
    }]);

    setIsSavingTemplate(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le template.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template sauvegardé",
      description: `Le template "${newTemplateName}" a été créé.`,
    });

    setNewTemplateName("");
    setShowSaveDialog(false);
    loadTemplates();
  };

  const handleAddRecipient = (email: string) => {
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
    }
  };

  const handleAddManualEmail = () => {
    if (manualEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail)) {
      handleAddRecipient(manualEmail);
      setManualEmail("");
    } else {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 20MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments([...attachments, ...validFiles]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    const uploadedAttachments = [];

    for (const file of attachments) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) continue;

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("email-attachments")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("email-attachments")
        .getPublicUrl(filePath);

      // Read file as base64 for Gmail API
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      uploadedAttachments.push({
        filename: file.name,
        contentType: file.type,
        data: base64Data,
        url: urlData.publicUrl,
      });
    }

    return uploadedAttachments;
  };

  const handleCreateDrafts = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      toast({
        title: "Champs manquants",
        description:
          "Veuillez remplir l'objet, le corps et ajouter au moins un destinataire.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const uploadedAttachments = await uploadAttachments();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session non trouvée");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-gmail-drafts",
        {
          body: {
            recipients,
            subject,
            body,
            attachments: uploadedAttachments,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;

      if (data.error === "Gmail not connected") {
        toast({
          title: "Gmail non connecté",
          description: "Veuillez vous reconnecter avec Google pour activer Gmail",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Brouillons créés",
        description: data.message || `${recipients.length} brouillon(s) Gmail ont été créés avec succès.`,
      });
    } catch (error: any) {
      console.error("Error creating drafts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les brouillons Gmail.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      toast({
        title: "Champs manquants",
        description:
          "Veuillez remplir l'objet, le corps et ajouter au moins un destinataire.",
        variant: "destructive",
      });
      return;
    }

    if (!gmailConnected) {
      toast({
        title: "Gmail non connecté",
        description: "Connectez votre compte Google pour envoyer des emails.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const uploadedAttachments = await uploadAttachments();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session non trouvée");
      }

      const { data, error } = await supabase.functions.invoke(
        "send-gmail-emails",
        {
          body: {
            recipients,
            subject,
            body,
            attachments: uploadedAttachments,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;

      if (data.error === "Gmail not connected") {
        toast({
          title: "Gmail non connecté",
          description: "Veuillez vous reconnecter avec Google pour activer Gmail",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Emails envoyés",
        description: data.message || `${recipients.length} email(s) envoyé(s) avec succès.`,
      });
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer les emails.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncHistory = async () => {
    if (!gmailConnected) {
      toast({
        title: "Gmail non connecté",
        description: "Connectez votre compte Gmail d'abord",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncingHistory(true);
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-gmail-history`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to sync Gmail history");
      }

      const data = await response.json();

      toast({
        title: "Synchronisation réussie",
        description: `${data.syncedCount} emails historiques ajoutés. Les entreprises correspondantes ne seront plus proposées.`,
      });

      // Recharger la liste des entreprises pour mettre à jour l'affichage
      loadCompanies();
    } catch (error: any) {
      console.error("Error syncing Gmail history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser l'historique Gmail.",
        variant: "destructive",
      });
    } finally {
      setSyncingHistory(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (recipients.length === 0) {
      toast({
        title: "Aucun destinataire",
        description: "Veuillez ajouter au moins un destinataire.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir l'objet et le message.",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "Date requise",
        description: "Veuillez sélectionner une date et heure d'envoi.",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(scheduledDate);
    if (scheduledDateTime <= new Date()) {
      toast({
        title: "Date invalide",
        description: "La date d'envoi doit être dans le futur.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Non authentifié",
          description: "Veuillez vous reconnecter.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('schedule-gmail-draft', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          recipients,
          subject,
          body,
          scheduledFor: scheduledDateTime.toISOString(),
          notifyOnSent,
        },
      });

      if (error) throw error;

      toast({
        title: "Email programmé",
        description: `Votre email sera envoyé le ${scheduledDateTime.toLocaleString('fr-FR')}`,
      });

      // Déclencher un événement pour actualiser la liste des emails programmés
      window.dispatchEvent(new CustomEvent('email-scheduled'));

      // Réinitialiser le formulaire
      setSubject("");
      setBody("");
      setRecipients([]);
      setScheduledDate("");
      setNotifyOnSent(false);
      setSendMode('now');
    } catch (error: any) {
      console.error("Error scheduling email:", error);
      toast({
        title: "Erreur",
        description: "Impossible de programmer l'email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Composer un Email</h2>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          {checkingGmail ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification de la connexion Gmail...</span>
            </div>
          ) : gmailConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Gmail connecté ✓</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncHistory}
                disabled={syncingHistory}
              >
                {syncingHistory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  "Synchroniser historique Gmail"
                )}
              </Button>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Gmail non connecté</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Votre connexion Gmail a expiré. Veuillez vous reconnecter avec Google pour activer l'envoi d'emails.</p>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    // Sauvegarder la page actuelle pour y revenir après OAuth
                    sessionStorage.setItem('post_login_redirect', '/dashboard');
                    window.location.href = '/auth';
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Reconnecter Gmail
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Nouveau Message</span>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Charger un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Save className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sauvegarder comme template</DialogTitle>
                        <DialogDescription>
                          Donnez un nom à ce template pour le réutiliser plus tard.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-name">Nom du template</Label>
                          <Input
                            id="template-name"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Mon template d'email"
                          />
                        </div>
                        <Button
                          onClick={handleSaveTemplate}
                          disabled={isSavingTemplate}
                          className="w-full"
                        >
                          {isSavingTemplate && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Sauvegarder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject">Objet</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet de votre email"
                />
              </div>

              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Écrivez votre message ici..."
                  rows={12}
                />
              </div>

              <div>
                <Label htmlFor="attachments">Pièces jointes (max 20MB par fichier)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("attachments")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Ajouter des fichiers
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4 mt-4">
                <Label>Mode d'envoi</Label>
                <RadioGroup value={sendMode} onValueChange={(value: 'now' | 'scheduled') => setSendMode(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now" className="font-normal cursor-pointer">
                      Envoyer maintenant
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                      Programmer l'envoi
                    </Label>
                  </div>
                </RadioGroup>

                {sendMode === 'scheduled' && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <div>
                      <Label htmlFor="scheduled-date">Date et heure d'envoi</Label>
                      <Input
                        id="scheduled-date"
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify"
                        checked={notifyOnSent}
                        onCheckedChange={(checked) => setNotifyOnSent(checked as boolean)}
                      />
                      <Label htmlFor="notify" className="font-normal cursor-pointer text-sm">
                        M'envoyer une notification quand l'email est envoyé
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {sendMode === 'now' ? (
                  <>
                    <Button onClick={handleSendEmails} disabled={loading} className="flex-1">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer maintenant
                    </Button>
                    <Button
                      onClick={handleCreateDrafts}
                      disabled={loading}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Créer les brouillons
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleScheduleEmail} disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Clock className="mr-2 h-4 w-4" />
                    Programmer l'envoi
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Destinataires ({recipients.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manual-email">Ajouter manuellement</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddManualEmail();
                      }
                    }}
                  />
                  <Button onClick={handleAddManualEmail} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="company-select">Depuis les contacts</Label>
                  {companies.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allEmails = companies
                          .filter((c) => c.selected_email)
                          .map((c) => c.selected_email);
                        const newRecipients = [...new Set([...recipients, ...allEmails])];
                        setRecipients(newRecipients);
                        toast({
                          title: "Contacts ajoutés",
                          description: `${allEmails.length} contact(s) ajouté(s)`,
                        });
                      }}
                    >
                      Sélectionner tous
                    </Button>
                  )}
                </div>
                <Select
                  onValueChange={(value) => {
                    const company = companies.find((c) => c.id === value);
                    if (company?.selected_email) {
                      handleAddRecipient(company.selected_email);
                    }
                  }}
                >
                  <SelectTrigger id="company-select">
                    <SelectValue placeholder="Sélectionner une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {recipients.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="w-full justify-between"
                  >
                    <span className="truncate">{email}</span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveRecipient(email)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
