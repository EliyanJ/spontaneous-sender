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
import { Loader2, Mail, Save, Upload, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    loadTemplates();
    loadCompanies();
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
    const { data, error } = await supabase
      .from("companies")
      .select("id, nom, selected_email")
      .not("selected_email", "is", null);

    if (error) {
      console.error("Error loading companies:", error);
      return;
    }

    setCompanies(data || []);
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
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;

      if (data.authUrl) {
        const authUrl: string = data.authUrl;
        if (window.top && window.top !== window.self) {
          (window.top as Window).location.href = authUrl;
        } else {
          window.location.href = authUrl;
        }
        return;
      }

      toast({
        title: "Brouillons créés",
        description: `${recipients.length} brouillon(s) Gmail ont été créés avec succès.`,
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

    setLoading(true);

    try {
      const uploadedAttachments = await uploadAttachments();

      const {
        data: { session },
      } = await supabase.auth.getSession();

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
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;

      if (data.authUrl) {
        const authUrl: string = data.authUrl;
        if (window.top && window.top !== window.self) {
          (window.top as Window).location.href = authUrl;
        } else {
          window.location.href = authUrl;
        }
        return;
      }

      toast({
        title: "Emails envoyés",
        description:
          data.message || `${recipients.length} email(s) envoyé(s) avec succès.`,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Composer un Email</h2>
      </div>

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

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSendEmails} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer
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
                <Label htmlFor="company-select">Depuis les contacts</Label>
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
