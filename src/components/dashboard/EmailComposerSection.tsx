import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Mail, Save, Upload, X, Plus, Clock, Send, CheckCircle, CalendarIcon, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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

export const EmailComposerSection = () => {
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
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledHour, setScheduledHour] = useState("11");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [notifyOnSent, setNotifyOnSent] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCompanies();
    checkGmailConnection();

    const handleCompaniesUpdate = () => loadCompanies();
    window.addEventListener('companies:updated', handleCompaniesUpdate);
    return () => window.removeEventListener('companies:updated', handleCompaniesUpdate);
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  const loadCompanies = async () => {
    // Récupérer les emails déjà envoyés
    const { data: campaignsData } = await supabase
      .from("email_campaigns")
      .select("recipient");
    
    const sentEmails = new Set(
      (campaignsData || []).map(c => c.recipient.toLowerCase())
    );

    // Récupérer les emails programmés (en attente d'envoi)
    const { data: scheduledData } = await supabase
      .from("scheduled_emails")
      .select("recipients")
      .eq("status", "pending");
    
    const scheduledEmails = new Set<string>();
    (scheduledData || []).forEach(s => {
      (s.recipients || []).forEach((r: string) => scheduledEmails.add(r.toLowerCase()));
    });

    // Récupérer les entreprises avec un email
    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, siren")
      .not("selected_email", "is", null);

    // Filtrer les entreprises déjà contactées ou programmées
    const filteredCompanies = (data || []).filter(company => {
      const email = company.selected_email.toLowerCase();
      return !sentEmails.has(email) && !scheduledEmails.has(email);
    });

    setCompanies(filteredCompanies);
  };

  const checkGmailConnection = async () => {
    try {
      setCheckingGmail(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        setGmailConnected(false);
        return;
      }

      const { data, error } = await supabase
        .from("gmail_tokens")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking Gmail connection:", error);
      }

      setGmailConnected(!!data);
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
      toast({ title: "Template chargé" });
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !subject.trim() || !body.trim()) {
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    setIsSavingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
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
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
      return;
    }

    toast({ title: "Template sauvegardé" });
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
      toast({ title: "Email invalide", variant: "destructive" });
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.size <= 20 * 1024 * 1024);
    setAttachments([...attachments, ...validFiles]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    const uploadedAttachments = [];
    for (const file of attachments) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) continue;

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from("email-attachments").upload(filePath, file);

      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });

      uploadedAttachments.push({
        filename: file.name,
        contentType: file.type,
        data: base64Data,
      });
    }
    return uploadedAttachments;
  };

  const handleSendEmails = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      toast({ title: "Champs manquants", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    if (!gmailConnected) {
      toast({ title: "Gmail non connecté", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const uploadedAttachments = await uploadAttachments();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error("Session non trouvée");

      const { data, error } = await supabase.functions.invoke("send-gmail-emails", {
        body: { recipients, subject, body, attachments: uploadedAttachments },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({ title: "Emails envoyés", description: `${recipients.length} email(s) envoyé(s)` });
      
      // Reset form
      setSubject("");
      setBody("");
      setRecipients([]);
      setAttachments([]);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (recipients.length === 0 || !subject.trim() || !body.trim()) {
      toast({ title: "Champs manquants", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    if (!scheduledDate) {
      toast({ title: "Date manquante", description: "Sélectionnez une date d'envoi", variant: "destructive" });
      return;
    }

    // Créer la date programmée en combinant date + heure + minutes
    const year = scheduledDate.getFullYear();
    const month = scheduledDate.getMonth();
    const day = scheduledDate.getDate();
    const hour = parseInt(scheduledHour, 10) || 11;
    const minute = parseInt(scheduledMinute, 10) || 0;
    
    const scheduledDateTime = new Date(year, month, day, hour, minute, 0, 0);
    
    // Vérifier que la date est valide
    if (isNaN(scheduledDateTime.getTime())) {
      toast({ title: "Date invalide", description: "La date sélectionnée n'est pas valide", variant: "destructive" });
      return;
    }
    
    if (scheduledDateTime <= new Date()) {
      toast({ title: "Date invalide", description: "La date doit être dans le futur", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" });
        return;
      }

      // FIX: Upload et convertir les pièces jointes en base64 avant programmation
      const uploadedAttachments = await uploadAttachments();

      const scheduledForISO = scheduledDateTime.toISOString();
      console.log('Scheduling email for:', scheduledForISO, 'with', uploadedAttachments.length, 'attachments');

      const { error } = await supabase.functions.invoke('schedule-gmail-draft', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          recipients, 
          subject, 
          body, 
          scheduledFor: scheduledForISO, 
          notifyOnSent,
          attachments: uploadedAttachments  // AJOUT: inclure les pièces jointes
        },
      });

      if (error) throw error;

      toast({ title: "Email programmé", description: `Envoi prévu le ${scheduledDateTime.toLocaleString('fr-FR')}` });
      window.dispatchEvent(new CustomEvent('email-scheduled'));
      
      setSubject("");
      setBody("");
      setRecipients([]);
      setAttachments([]);  // Reset pièces jointes
      setScheduledDate(undefined);
      setScheduledHour("11");
      setScheduledMinute("00");
      setSendMode('now');
    } catch (err: any) {
      console.error('Schedule error:', err);
      toast({ title: "Erreur", description: err?.message || "Impossible de programmer l'email", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gmail Status */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          {checkingGmail ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification Gmail...</span>
            </div>
          ) : gmailConnected ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Gmail connecté</span>
            </div>
          ) : (
            <Alert variant="destructive" className="border-0 bg-destructive/10">
              <AlertTitle>Gmail non connecté</AlertTitle>
              <AlertDescription>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=emails&emailsSection=compose');
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Connecter Gmail
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Form */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Nouveau message</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                        <DialogTitle>Sauvegarder template</DialogTitle>
                        <DialogDescription>Nommez ce template</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Nom du template"
                        />
                        <Button onClick={handleSaveTemplate} disabled={isSavingTemplate} className="w-full">
                          {isSavingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sauvegarder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="subject" className="text-muted-foreground">Objet</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet de votre email"
                  className="mt-1.5 bg-background border-border"
                />
              </div>

              <div>
                <Label htmlFor="body" className="text-muted-foreground">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Écrivez votre message..."
                  rows={10}
                  className="mt-1.5 bg-background border-border resize-none"
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Pièces jointes</Label>
                <div className="mt-1.5">
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
                    className="w-full border-dashed"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Ajouter des fichiers
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAttachment(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Mode */}
              <div className="border-t border-border pt-4 space-y-4">
                <Label className="text-muted-foreground">Mode d'envoi</Label>
                <RadioGroup value={sendMode} onValueChange={(v: 'now' | 'scheduled') => setSendMode(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now" className="font-normal cursor-pointer">Envoyer maintenant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="font-normal cursor-pointer">Programmer l'envoi</Label>
                  </div>
                </RadioGroup>

                {sendMode === 'scheduled' && (
                  <div className="pl-6 border-l-2 border-primary/20 space-y-4">
                    {/* Conseil */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Conseil :</span> Les emails envoyés vers 11h ont un meilleur taux d'ouverture en moyenne.
                      </p>
                    </div>
                    
                    {/* Date picker */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Date d'envoi</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100] bg-popover" align="start" sideOffset={8}>
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            locale={fr}
                            className="pointer-events-auto rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time picker - Taper directement */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Heure d'envoi</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={scheduledHour}
                          onChange={(e) => {
                            const val = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                            setScheduledHour(val.toString().padStart(2, '0'));
                          }}
                          className="w-[70px] text-center"
                          placeholder="HH"
                        />
                        <span className="text-lg font-medium text-muted-foreground">:</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={scheduledMinute}
                          onChange={(e) => {
                            const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                            setScheduledMinute(val.toString().padStart(2, '0'));
                          }}
                          className="w-[70px] text-center"
                          placeholder="MM"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify"
                        checked={notifyOnSent}
                        onCheckedChange={(checked) => setNotifyOnSent(checked as boolean)}
                      />
                      <Label htmlFor="notify" className="font-normal cursor-pointer text-sm">
                        M'envoyer une notification à l'envoi
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {sendMode === 'now' ? (
                  <Button onClick={handleSendEmails} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer
                  </Button>
                ) : (
                  <Button onClick={handleScheduleEmail} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Clock className="mr-2 h-4 w-4" />
                    Programmer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipients */}
        <div>
          <Card className="bg-card/50 border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Destinataires ({recipients.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-muted-foreground">Ajouter manuellement</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddManualEmail())}
                    className="bg-background"
                  />
                  <Button onClick={handleAddManualEmail} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-muted-foreground">Depuis les contacts</Label>
                  {companies.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allEmails = companies.filter(c => c.selected_email).map(c => c.selected_email);
                        setRecipients([...new Set([...recipients, ...allEmails])]);
                        toast({ title: "Contacts ajoutés", description: `${allEmails.length} ajouté(s)` });
                      }}
                    >
                      Tout ajouter
                    </Button>
                  )}
                </div>
                <Select
                  onValueChange={(value) => {
                    const company = companies.find((c) => c.id === value);
                    if (company?.selected_email) handleAddRecipient(company.selected_email);
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="w-full justify-between py-2">
                    <span className="truncate text-xs">{email}</span>
                    <X className="h-3 w-3 cursor-pointer shrink-0 ml-2" onClick={() => handleRemoveRecipient(email)} />
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
