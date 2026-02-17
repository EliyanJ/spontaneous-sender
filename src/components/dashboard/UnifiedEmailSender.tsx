import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { z } from "zod";
import {
  Loader2,
  Sparkles,
  FileText,
  Upload,
  Send,
  Building2,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  Clock,
  CalendarIcon,
  Lightbulb,
  Save,
  FolderOpen,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Globe,
  Download,
  Copy,
  Crown
} from "lucide-react";
import { GenerationOverlay } from "./GenerationOverlay";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradeBanner } from "@/components/UpgradeBanner";

interface Company {
  id: string;
  nom: string;
  selected_email: string | null;
  website_url: string | null;
  ville: string | null;
  libelle_ape: string | null;
  siren: string;
}

interface GeneratedEmail {
  company_id: string;
  company_name: string;
  company_email?: string;
  website_url?: string;
  success: boolean;
  subject?: string;
  body?: string;
  error?: string;
  scraped_info?: boolean;
  coverLetter?: string;
  subject_type?: string;
  tone?: string;
}

const SUBJECT_TYPES = [
  { value: 'corporate', label: 'Corporate / RH', description: 'Sécurisant, ATS-friendly' },
  { value: 'value', label: 'Valeur ajoutée', description: 'Montre l\'apport sans se vendre' },
  { value: 'manager', label: 'Manager', description: 'Proximité métier, concret' },
  { value: 'question', label: 'Question', description: 'Engagement doux' },
];

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formel', description: 'Ton RH classique' },
  { value: 'balanced', label: 'Équilibré', description: 'Professionnel mais accessible' },
  { value: 'direct', label: 'Direct', description: 'Orienté manager/action' },
  { value: 'soft', label: 'Adouci', description: 'Question ouverte, non pressant' },
];

interface ProcessLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'processing';
  message: string;
  company?: string;
}

interface SavedCvProfile {
  id: string;
  name: string;
  content: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  content: string;
}

export const UnifiedEmailSender = () => {
  // Plan features
  const { features, isPremium, isLoading: planLoading } = usePlanFeatures();

  // Core states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingGmail, setCheckingGmail] = useState(true);

  // AI options toggles - only available for premium
  const [enableAIEmails, setEnableAIEmails] = useState(false);
  const [enableCoverLetter, setEnableCoverLetter] = useState(false);

  // Manual email content
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Manual recipients (optional)
  const [manualEmail, setManualEmail] = useState("");
  const [manualRecipients, setManualRecipients] = useState<string[]>([]);

  // AI configuration
  const [template, setTemplate] = useState("");
  const [cvContent, setCvContent] = useState("");
  const [selectedSubjectType, setSelectedSubjectType] = useState("corporate");
  const [selectedTone, setSelectedTone] = useState("balanced");
  const [savedCvProfiles, setSavedCvProfiles] = useState<SavedCvProfile[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedCvProfileId, setSelectedCvProfileId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isParsingCv, setIsParsingCv] = useState(false);

  // Generated content
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [processLogs, setProcessLogs] = useState<ProcessLog[]>([]);
  const [currentStep, setCurrentStep] = useState("");

  // Sending states
  const [isSending, setIsSending] = useState(false);
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledHour, setScheduledHour] = useState("11");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [notifyOnSent, setNotifyOnSent] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState<"config" | "preview">("config");
  const [editingEmail, setEditingEmail] = useState<GeneratedEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [previewEmail, setPreviewEmail] = useState<GeneratedEmail | null>(null);
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");

  // Callback for GenericTemplateEditor
  const handleGenericTemplateChange = (tpl: { subject: string; body: string }) => {
    if (!isPremium && !enableAIEmails) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  useEffect(() => {
    loadCompanies();
    checkGmailConnection();
    loadSavedProfiles();
    loadSavedTemplates();
    loadUserProfile();

    // Listen for Gmail connection event
    const handleGmailConnected = () => {
      checkGmailConnection();
    };
    window.addEventListener('gmail-connected', handleGmailConnected);

    return () => {
      window.removeEventListener('gmail-connected', handleGmailConnected);
    };
  }, []);

  // Check for Gmail refresh parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmailRefresh') === 'true') {
      params.delete('gmailRefresh');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
      checkGmailConnection();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const loadCompanies = async () => {
    const { data: campaignsData } = await supabase.from("email_campaigns").select("recipient");
    const sentEmails = new Set((campaignsData || []).map(c => c.recipient.toLowerCase()));

    const { data: scheduledData } = await supabase.from("scheduled_emails").select("recipients").eq("status", "pending");
    const scheduledEmails = new Set<string>();
    (scheduledData || []).forEach(s => (s.recipients || []).forEach((r: string) => scheduledEmails.add(r.toLowerCase())));

    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, website_url, ville, libelle_ape, siren")
      .not("selected_email", "is", null)
      .neq("selected_email", "NOT_FOUND");

    const filteredCompanies = (data || []).filter(c => {
      const email = c.selected_email?.toLowerCase();
      return email && !sentEmails.has(email) && !scheduledEmails.has(email);
    });

    setCompanies(filteredCompanies);
  };

  const checkGmailConnection = async () => {
    setCheckingGmail(true);
    try {
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

  const loadSavedProfiles = async () => {
    const { data } = await supabase.from("user_cv_profiles").select("id, name, content").order("created_at", { ascending: false });
    setSavedCvProfiles(data || []);
  };

  const loadSavedTemplates = async () => {
    const { data } = await supabase.from("user_email_templates").select("id, name, content").order("created_at", { ascending: false });
    setSavedTemplates(data || []);
  };

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("cv_content").eq("id", user.id).maybeSingle();
    if (data?.cv_content) setCvContent(data.cv_content);
  };

  const handleSelectCompany = (id: string) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedCompanies(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCompanies.size === companies.length) setSelectedCompanies(new Set());
    else setSelectedCompanies(new Set(companies.map(c => c.id)));
  };

  const manualRecipientSchema = z.string().trim().email().max(255);

  const handleAddManualRecipient = () => {
    const parsed = manualRecipientSchema.safeParse(manualEmail);
    if (!parsed.success) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }

    const normalized = parsed.data.toLowerCase();
    setManualRecipients((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setManualEmail("");
  };

  const handleRemoveManualRecipient = (email: string) => {
    setManualRecipients((prev) => prev.filter((e) => e !== email));
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      setCvContent(await file.text());
      toast({ title: "CV chargé" });
      return;
    }

    setIsParsingCv(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-cv-document", {
        body: { fileBase64: base64, fileName: file.name, fileType: file.type },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      if (data?.success && data?.text) {
        setCvContent(data.text);
        toast({ title: "CV analysé" });
      } else throw new Error(data?.error || "Échec");
    } catch {
      toast({ title: "Erreur d'analyse", variant: "destructive" });
    } finally {
      setIsParsingCv(false);
    }
  };

  const handleLoadCvProfile = (profileId: string) => {
    const profile = savedCvProfiles.find(p => p.id === profileId);
    if (profile) {
      setCvContent(profile.content);
      setSelectedCvProfileId(profileId);
      toast({ title: `Profil "${profile.name}" chargé` });
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const tpl = savedTemplates.find(t => t.id === templateId);
    if (tpl) {
      setTemplate(tpl.content);
      setSelectedTemplateId(templateId);
      toast({ title: `Template "${tpl.name}" chargé` });
    }
  };

  const handleSaveCvProfile = async () => {
    if (!newProfileName.trim() || !cvContent.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_cv_profiles").insert({
      user_id: user.id, name: newProfileName.trim(), content: cvContent
    });

    if (error) toast({ title: "Erreur", variant: "destructive" });
    else {
      toast({ title: "Profil sauvegardé" });
      setNewProfileName("");
      setShowSaveProfileDialog(false);
      loadSavedProfiles();
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !template.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_email_templates").insert({
      user_id: user.id, name: newTemplateName.trim(), content: template
    });

    if (error) toast({ title: "Erreur", variant: "destructive" });
    else {
      toast({ title: "Template sauvegardé" });
      setNewTemplateName("");
      setShowSaveTemplateDialog(false);
      loadSavedTemplates();
    }
  };

  const addLog = (type: ProcessLog['type'], message: string, company?: string) => {
    setProcessLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type, message, company
    }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 20 * 1024 * 1024);
    setAttachments([...attachments, ...validFiles]);
  };

  const uploadAttachments = async () => {
    const uploaded = [];
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

      uploaded.push({ filename: file.name, contentType: file.type, data: base64Data });
    }
    return uploaded;
  };

  const handleGenerate = async () => {
    const forceRegenerate = false; // will be true when called from "Regénérer tout"
    return handleGenerateInternal(forceRegenerate);
  };

  const handleForceRegenerate = () => {
    return handleGenerateInternal(true);
  };

  const handleGenerateInternal = async (forceRegenerate: boolean) => {
    // Manual mode: allow sending either to selected companies OR to manual recipient emails
    if (!enableAIEmails && !enableCoverLetter) {
      if (selectedCompanies.size === 0 && manualRecipients.length === 0) {
        toast({ title: "Ajoutez au moins un destinataire", variant: "destructive" });
        return;
      }

      const selectedList = companies.filter(c => selectedCompanies.has(c.id));
      const manualList: GeneratedEmail[] = manualRecipients.map((email) => ({
        company_id: `manual:${email}`,
        company_name: email,
        company_email: email,
        success: true,
        subject,
        body,
      }));

      // Merge with existing: keep already-generated that are still selected, add new ones
      const existingIds = new Set(generatedEmails.map(e => e.company_id));
      const newCompanyEmails = selectedList
        .filter(c => forceRegenerate || !existingIds.has(c.id))
        .map(c => ({
          company_id: c.id,
          company_name: c.nom,
          company_email: c.selected_email || undefined,
          success: true,
          subject,
          body,
        }));
      const newManualEmails = manualList.filter(m => forceRegenerate || !existingIds.has(m.company_id));

      if (forceRegenerate) {
        setGeneratedEmails([...newCompanyEmails, ...newManualEmails]);
      } else {
        setGeneratedEmails(prev => [...prev.filter(e => !newCompanyEmails.find(n => n.company_id === e.company_id) && !newManualEmails.find(n => n.company_id === e.company_id)), ...newCompanyEmails, ...newManualEmails]);
      }
      setActiveTab("preview");
      return;
    }

    // AI modes require selecting companies or manual recipients (Plus)
    if (selectedCompanies.size === 0 && manualRecipients.length === 0) {
      toast({ title: "Ajoutez au moins un destinataire", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setElapsedTime(0);
    setProcessLogs([]);

    // Smart merge: keep already generated, only generate for new
    const existingGeneratedIds = new Set(generatedEmails.map(e => e.company_id));
    const previousEmails = forceRegenerate ? [] : [...generatedEmails];
    const selectedList = companies.filter(c => selectedCompanies.has(c.id));
    // Filter out already generated companies (smart merge)
    const companiesToGenerate = forceRegenerate ? selectedList : selectedList.filter(c => !existingGeneratedIds.has(c.id));
    // Manual recipients for AI generation (Plus plan)
    const manualRecipientsToGenerate = forceRegenerate 
      ? manualRecipients 
      : manualRecipients.filter(email => !existingGeneratedIds.has(`manual:${email}`));

    const totalToGenerate = companiesToGenerate.length + (enableAIEmails ? manualRecipientsToGenerate.length : 0);

    if (totalToGenerate === 0) {
      toast({ title: "Tous les emails sont déjà générés", description: "Utilisez 'Regénérer tout' pour forcer une nouvelle génération." });
      setIsGenerating(false);
      setActiveTab("preview");
      return;
    }

    addLog('info', `🚀 Génération pour ${totalToGenerate} destinataire(s) (${existingGeneratedIds.size} déjà générés)`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const allResults: GeneratedEmail[] = [];

      if (enableAIEmails) {
        addLog('info', `📧 Génération des emails personnalisés...`);
        const batchSize = 5;

        // Generate for companies
        for (let i = 0; i < companiesToGenerate.length; i += batchSize) {
          const batch = companiesToGenerate.slice(i, i + batchSize);
          setCurrentStep(`Lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(companiesToGenerate.length / batchSize)}`);

          const { data, error } = await supabase.functions.invoke("generate-personalized-emails", {
            body: { companies: batch, template: template || null, cvContent: cvContent || null, subjectType: selectedSubjectType, tone: selectedTone },
            headers: { Authorization: `Bearer ${session.access_token}` }
          });

          if (error) {
            batch.forEach(c => allResults.push({ company_id: c.id, company_name: c.nom, success: false, error: error.message }));
          } else if (data?.results) {
            allResults.push(...data.results);
          }

          setProgress(Math.round(((i + batch.length) / totalToGenerate) * 100));
          if (i + batchSize < companiesToGenerate.length) await new Promise(r => setTimeout(r, 1000));
        }

        // Generate AI emails for manual recipients (Plus plan)
        if (manualRecipientsToGenerate.length > 0) {
          addLog('info', `📧 Génération IA pour ${manualRecipientsToGenerate.length} email(s) manuel(s)...`);
          const manualCompanyObjects = manualRecipientsToGenerate.map(email => ({
            id: `manual:${email}`,
            nom: 'Candidature générique',
            selected_email: email,
            website_url: null,
            ville: null,
            libelle_ape: null,
            siren: `manual-${email}`,
          }));

          for (let i = 0; i < manualCompanyObjects.length; i += batchSize) {
            const batch = manualCompanyObjects.slice(i, i + batchSize);
            setCurrentStep(`Emails manuels ${i + 1}-${Math.min(i + batchSize, manualCompanyObjects.length)}`);

            const { data, error } = await supabase.functions.invoke("generate-personalized-emails", {
              body: { companies: batch, template: template || null, cvContent: cvContent || null, subjectType: selectedSubjectType, tone: selectedTone },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (error) {
              batch.forEach(c => allResults.push({ company_id: c.id, company_name: c.nom, company_email: c.selected_email || undefined, success: false, error: error.message }));
            } else if (data?.results) {
              const results = data.results.map((r: GeneratedEmail, idx: number) => ({
                ...r,
                company_email: batch[idx]?.selected_email || r.company_email,
              }));
              allResults.push(...results);
            }

            if (i + batchSize < manualCompanyObjects.length) await new Promise(r => setTimeout(r, 1000));
          }
        }
      } else {
        // Use manual email content for companies
        companiesToGenerate.forEach(c => allResults.push({
          company_id: c.id,
          company_name: c.nom,
          company_email: c.selected_email || undefined,
          success: true,
          subject,
          body
        }));
      }

      if (enableCoverLetter) {
        addLog('info', `📄 Génération des lettres de motivation...`);
        for (let i = 0; i < allResults.length; i++) {
          const result = allResults[i];
          const company = selectedList.find(c => c.id === result.company_id);
          if (!company) continue;

          setCurrentStep(`Lettre ${i + 1}/${allResults.length}`);
          addLog('processing', `Génération de la lettre...`, company.nom);

          try {
            const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
              body: { company, cvContent: cvContent || null },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!error && data?.success && data?.coverLetter) {
              result.coverLetter = data.coverLetter;
              addLog('success', `✅ Lettre générée`, company.nom);
            }
          } catch (err) {
            addLog('error', `❌ Erreur lettre`, company.nom);
          }

          if (i < allResults.length - 1) await new Promise(r => setTimeout(r, 500));
        }
      }

      // Merge: keep previous + add new results
      const mergedEmails = [...previousEmails.filter(e => !allResults.find(r => r.company_id === e.company_id)), ...allResults];
      setGeneratedEmails(mergedEmails);
      const successCount = mergedEmails.filter(r => r.success).length;
      addLog('success', `🎉 ${successCount}/${mergedEmails.length} emails prêts (dont ${previousEmails.length} conservés)`);
      setActiveTab("preview");
      toast({ title: "Génération terminée", description: `${successCount} email(s) prêt(s)` });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setCurrentStep("");
    }
  };

  const handleSendAll = async () => {
    const validEmails = generatedEmails.filter(e => e.success && e.company_email);
    if (validEmails.length === 0) {
      toast({ title: "Aucun email à envoyer", variant: "destructive" });
      return;
    }

    if (sendMode === 'scheduled' && !scheduledDate) {
      toast({ title: "Date manquante", variant: "destructive" });
      return;
    }

    setIsSending(true);
    let sentCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const uploadedAttachments = await uploadAttachments();

      for (const email of validEmails) {
        try {
          // Build email body with cover letter if available
          let finalBody = email.body || "";
          if (email.coverLetter) {
            finalBody += `\n\n---\nLettre de motivation en pièce jointe disponible sur demande.\n\n${email.coverLetter}`;
          }

          if (sendMode === 'scheduled') {
            const year = scheduledDate!.getFullYear();
            const month = scheduledDate!.getMonth();
            const day = scheduledDate!.getDate();
            const hour = parseInt(scheduledHour, 10) || 11;
            const minute = parseInt(scheduledMinute, 10) || 0;
            const scheduledDateTime = new Date(year, month, day, hour, minute, 0, 0);

            await supabase.functions.invoke('schedule-gmail-draft', {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: {
                recipients: [email.company_email],
                subject: email.subject,
                body: finalBody,
                scheduledFor: scheduledDateTime.toISOString(),
                notifyOnSent,
                attachments: uploadedAttachments
              }
            });
          } else {
            await supabase.functions.invoke("send-gmail-emails", {
              body: {
                recipients: [email.company_email],
                subject: email.subject,
                body: finalBody,
                attachments: uploadedAttachments,
                subject_type: email.subject_type || selectedSubjectType,
                tone: email.tone || selectedTone,
              },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
          }
          sentCount++;
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.error(`Failed for ${email.company_name}:`, err);
        }
      }

      toast({
        title: sendMode === 'scheduled' ? "Programmation terminée" : "Envoi terminé",
        description: `${sentCount}/${validEmails.length} email(s) ${sendMode === 'scheduled' ? 'programmés' : 'envoyés'}`
      });

      // Reset
      setGeneratedEmails([]);
      setSelectedCompanies(new Set());
      setActiveTab("config");
      loadCompanies();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleEditEmail = (email: GeneratedEmail) => {
    setEditingEmail(email);
    setEditedSubject(email.subject || "");
    setEditedBody(email.body || "");
    setEditedCoverLetter(email.coverLetter || "");
  };

  const handleSaveEdit = () => {
    if (!editingEmail) return;
    setGeneratedEmails(prev => prev.map(e =>
      e.company_id === editingEmail.company_id
        ? { ...e, subject: editedSubject, body: editedBody, coverLetter: editedCoverLetter || e.coverLetter }
        : e
    ));
    setEditingEmail(null);
    toast({ title: "Email modifié" });
  };

  const handleRemoveGeneratedEmail = (companyId: string) => {
    setGeneratedEmails(prev => prev.filter(e => e.company_id !== companyId));
  };

  // Auto-sync manual recipients into preview (non-AI mode)
  useEffect(() => {
    if (enableAIEmails || enableCoverLetter) return;
    if (manualRecipients.length === 0) return;
    
    setGeneratedEmails(prev => {
      // Keep non-manual entries
      const nonManual = prev.filter(e => !e.company_id.startsWith('manual:'));
      // Build manual entries
      const manualEntries: GeneratedEmail[] = manualRecipients.map(email => {
        const existing = prev.find(e => e.company_id === `manual:${email}`);
        return existing 
          ? { ...existing, subject: subject || existing.subject, body: body || existing.body }
          : { company_id: `manual:${email}`, company_name: email, company_email: email, success: true, subject, body };
      });
      return [...nonManual, ...manualEntries];
    });
  }, [manualRecipients, subject, body, enableAIEmails, enableCoverLetter]);

  const successfulEmails = generatedEmails.filter(e => e.success);
  const selectedCount = selectedCompanies.size;
  const manualCount = manualRecipients.length;
  const prepareCount = selectedCount + manualCount;
  const isAiMode = enableAIEmails || enableCoverLetter;
  const isPrepareDisabled = isGenerating || !gmailConnected || prepareCount === 0;

  // Show loading state while plan is loading
  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <GenerationOverlay
        isOpen={isGenerating}
        progress={progress}
        elapsedTime={elapsedTime}
        currentStep={currentStep}
        processLogs={processLogs}
        totalItems={selectedCompanies.size}
      />

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
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Gmail connecté</span>
              </div>
            ) : (
              <Alert variant="destructive" className="border-0 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Gmail non connecté</AlertTitle>
                <AlertDescription>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.location.href = '/connect-gmail?returnTo=' + encodeURIComponent('/dashboard?tab=emails&emailsSection=send')}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Connecter Gmail
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "config" | "preview")}>
          <TabsList className="bg-card/50 border border-border w-full">
            <TabsTrigger value="config" className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={generatedEmails.length === 0 && manualRecipients.length === 0}>
              <Eye className="h-4 w-4" />
              Prévisualisation ({successfulEmails.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6 space-y-6">
            {/* Company Selection */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Destinataires</CardTitle>
                    <CardDescription>
                      {selectedCount}/{companies.length} entreprise(s) sélectionnée(s)
                      {manualCount > 0 ? ` • ${manualCount} email(s) manuel(s)` : ""}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCompanies.size === companies.length ? "Désélectionner tout" : "Tout sélectionner"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-recipient">Ajouter un email manuellement</Label>
                  <div className="flex items-end gap-2">
                    <Input
                      id="manual-recipient"
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddManualRecipient();
                        }
                      }}
                      placeholder="email@exemple.com"
                      className="bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddManualRecipient}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Disponible en mode email manuel (Options IA désactivées).
                  </p>

                  {manualRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {manualRecipients.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          <span className="max-w-[240px] truncate">{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleRemoveManualRecipient(email)}
                            aria-label={`Retirer ${email}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  {companies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Aucune entreprise avec email. Recherchez d'abord des contacts.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {companies.map(company => (
                        <div
                          key={company.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            selectedCompanies.has(company.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          )}
                          onClick={() => handleSelectCompany(company.id)}
                        >
                          <Checkbox checked={selectedCompanies.has(company.id)} onChange={() => {}} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{company.nom}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{company.selected_email}</p>
                          </div>
                          {company.website_url && (
                            <Badge variant="outline" className="shrink-0">
                              <Globe className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI Options - Only for Premium users */}
            {isPremium ? (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Options IA
                  </CardTitle>
                  <CardDescription>
                    Activez les fonctionnalités d'intelligence artificielle.
                    <span className="block mt-1 text-xs text-muted-foreground/80">
                      💡 Désactivez les deux options ci-dessous pour utiliser le mode d'envoi manuel classique.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Emails personnalisés IA</p>
                        <p className="text-sm text-muted-foreground">L'IA génère des emails adaptés à chaque entreprise</p>
                      </div>
                    </div>
                    <Switch checked={enableAIEmails} onCheckedChange={setEnableAIEmails} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Lettres de motivation IA</p>
                        <p className="text-sm text-muted-foreground">Génère une lettre pour chaque entreprise</p>
                      </div>
                    </div>
                    <Switch checked={enableCoverLetter} onCheckedChange={setEnableCoverLetter} />
                  </div>

                  {/* Subject Type & Tone selectors */}
                  {enableAIEmails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Type d'approche</Label>
                        <Select value={selectedSubjectType} onValueChange={setSelectedSubjectType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECT_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                <div className="flex flex-col">
                                  <span>{t.label}</span>
                                  <span className="text-xs text-muted-foreground">{t.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Ton de l'email</Label>
                        <Select value={selectedTone} onValueChange={setSelectedTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONE_OPTIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                <div className="flex flex-col">
                                  <span>{t.label}</span>
                                  <span className="text-xs text-muted-foreground">{t.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Upgrade Banner for AI features - only shown for non-premium */
              <UpgradeBanner
                variant="compact"
                title="Personnalisation IA"
                description="Passez au plan Plus pour générer des emails personnalisés avec l'IA"
                features={[
                  "Emails adaptés à chaque entreprise",
                  "Lettres de motivation générées",
                  "Scraping du site web pour personnalisation"
                ]}
              />
            )}

            {/* AI Configuration - shown when AI is enabled */}
            {(enableAIEmails || enableCoverLetter) && (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Configuration IA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* CV Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Votre CV / Profil</Label>
                      {savedCvProfiles.length > 0 && (
                        <Select value={selectedCvProfileId} onValueChange={handleLoadCvProfile}>
                          <SelectTrigger className="w-[180px]">
                            <FolderOpen className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Charger..." />
                          </SelectTrigger>
                          <SelectContent>
                            {savedCvProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input type="file" accept=".pdf,.docx,.txt" onChange={handleCvUpload} className="hidden" id="cv-upload-unified" disabled={isParsingCv} />
                      <Button variant="outline" onClick={() => document.getElementById("cv-upload-unified")?.click()} disabled={isParsingCv} className="gap-2">
                        {isParsingCv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Importer CV
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setShowSaveProfileDialog(true)} disabled={!cvContent.trim()}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea value={cvContent} onChange={(e) => setCvContent(e.target.value)} placeholder="Collez vos compétences et expériences..." rows={4} className="bg-background" />
                  </div>

                  {/* Template Section - only for AI Emails */}
                  {enableAIEmails && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Style d'email souhaité</Label>
                        {savedTemplates.length > 0 && (
                          <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                            <SelectTrigger className="w-[180px]">
                              <FolderOpen className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="Charger..." />
                            </SelectTrigger>
                            <SelectContent>
                              {savedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="Décrivez le style d'email souhaité..." rows={3} className="bg-background flex-1" />
                        <Button variant="outline" size="icon" onClick={() => setShowSaveTemplateDialog(true)} disabled={!template.trim()}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Manual Email Content - shown when AI emails disabled */}
            {!enableAIEmails && (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Contenu de l'email</CardTitle>
                    {savedTemplates.length > 0 && (
                      <Select 
                        value="" 
                        onValueChange={(templateId) => {
                          const tpl = savedTemplates.find(t => t.id === templateId);
                          if (tpl) {
                            // Parse template content - format: "Subject: xxx\n\nBody..."
                            const lines = tpl.content.split('\n');
                            const subjectLine = lines.find(l => l.toLowerCase().startsWith('objet:') || l.toLowerCase().startsWith('subject:'));
                            if (subjectLine) {
                              setSubject(subjectLine.replace(/^(objet|subject):\s*/i, '').trim());
                              setBody(lines.filter(l => l !== subjectLine).join('\n').trim());
                            } else {
                              setBody(tpl.content);
                            }
                            toast({ title: `Template "${tpl.name}" chargé` });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Charger un template" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Objet</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Candidature spontanée - [Votre profil]" className="mt-1.5 bg-background" />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écrivez votre email..." rows={8} className="mt-1.5 bg-background" />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Variables disponibles : <code className="bg-muted px-1 rounded">{'{entreprise}'}</code> <code className="bg-muted px-1 rounded">{'{ville}'}</code> <code className="bg-muted px-1 rounded">{'{secteur}'}</code>
                    </p>
                  </div>
                  <div>
                    <Label>Pièces jointes</Label>
                    <Input type="file" multiple onChange={handleFileChange} className="hidden" id="attachments-unified" />
                    <Button variant="outline" onClick={() => document.getElementById("attachments-unified")?.click()} className="w-full mt-1.5 border-dashed">
                      <Upload className="mr-2 h-4 w-4" />
                      Ajouter des fichiers
                    </Button>
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachments.map((file, i) => (
                          <Badge key={i} variant="secondary" className="w-full justify-between">
                            <span className="truncate">{file.name}</span>
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Save as template button */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (!subject.trim() && !body.trim()) {
                        toast({ title: "Écrivez d'abord un email", variant: "destructive" });
                        return;
                      }
                      const templateContent = subject.trim() ? `Objet: ${subject}\n\n${body}` : body;
                      setTemplate(templateContent);
                      setShowSaveTemplateDialog(true);
                    }}
                    disabled={!subject.trim() && !body.trim()}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Sauvegarder comme template
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button onClick={handleGenerate} disabled={isPrepareDisabled} className="w-full gap-2" size="lg">
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {isAiMode
                ? (selectedCount > 0 && manualCount > 0
                  ? `Générer pour ${selectedCount} entreprise(s) + ${manualCount} email(s)`
                  : selectedCount > 0
                    ? `Générer pour ${selectedCount} entreprise(s)`
                    : `Générer pour ${manualCount} email(s) manuel(s)`)
                : `Préparer ${prepareCount} email(s)`}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="mt-6 space-y-6">
            {/* Email List */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Emails prêts à envoyer</CardTitle>
                    <CardDescription>{successfulEmails.length} email(s) générés</CardDescription>
                  </div>
                  {generatedEmails.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleForceRegenerate} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Regénérer tout
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {generatedEmails.map(email => (
                      <div key={email.company_id} className={cn("p-3 rounded-lg border", email.success ? "" : "border-destructive/50")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {email.success ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                              <span className="font-medium truncate">{email.company_name}</span>
                              {email.coverLetter && <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Lettre</Badge>}
                            </div>
                            {email.success && (
                              <>
                                <p className="text-sm text-muted-foreground mt-1 truncate">📧 {email.company_email}</p>
                                <p className="text-sm text-foreground mt-1 font-medium">{email.subject}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{email.body?.substring(0, 100)}...</p>
                              </>
                            )}
                            {!email.success && <p className="text-sm text-destructive mt-1">{email.error}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {email.success && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setPreviewEmail(email)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEditEmail(email)}><Edit3 className="h-4 w-4" /></Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveGeneratedEmail(email.company_id)} className="text-destructive hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Send Options */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">Options d'envoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={sendMode} onValueChange={(v: 'now' | 'scheduled') => setSendMode(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now" className="cursor-pointer">Envoyer maintenant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="cursor-pointer">Programmer l'envoi</Label>
                  </div>
                </RadioGroup>

                {sendMode === 'scheduled' && (
                  <div className="pl-6 border-l-2 border-primary/20 space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Conseil :</span> Les emails envoyés vers 11h ont un meilleur taux d'ouverture.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start", !scheduledDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Heure</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" max="23" value={scheduledHour} onChange={(e) => setScheduledHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)).toString().padStart(2, '0'))} className="w-[70px] text-center" />
                        <span className="text-lg font-medium text-muted-foreground">:</span>
                        <Input type="number" min="0" max="59" value={scheduledMinute} onChange={(e) => setScheduledMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)).toString().padStart(2, '0'))} className="w-[70px] text-center" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="notify-unified" checked={notifyOnSent} onCheckedChange={(c) => setNotifyOnSent(c as boolean)} />
                      <Label htmlFor="notify-unified" className="cursor-pointer text-sm">M'envoyer une notification à l'envoi</Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Button */}
            <Button onClick={handleSendAll} disabled={isSending || successfulEmails.length === 0 || !gmailConnected} className="w-full gap-2" size="lg">
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : sendMode === 'now' ? <Send className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              {sendMode === 'now' ? `Envoyer ${successfulEmails.length} email(s)` : `Programmer ${successfulEmails.length} email(s)`}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation - {previewEmail?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Objet:</p>
              <p className="font-medium">{previewEmail?.subject}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Message:</p>
              <p className="whitespace-pre-wrap text-sm">{previewEmail?.body}</p>
            </div>
            {previewEmail?.coverLetter && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Lettre de motivation:
                </p>
                <p className="whitespace-pre-wrap text-sm">{previewEmail.coverLetter}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmail} onOpenChange={() => setEditingEmail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifier - {editingEmail?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Objet</Label>
              <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={10} className="mt-1.5" />
            </div>
            {editingEmail?.coverLetter && (
              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Lettre de motivation
                </Label>
                <Textarea value={editedCoverLetter} onChange={(e) => setEditedCoverLetter(e.target.value)} rows={12} className="mt-1.5" />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingEmail(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Profile Dialog */}
      <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le profil CV</DialogTitle>
            <DialogDescription>Donnez un nom à ce profil pour le réutiliser</DialogDescription>
          </DialogHeader>
          <Input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="Ex: Mon CV développeur" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSaveProfileDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveCvProfile} disabled={!newProfileName.trim()}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le template</DialogTitle>
            <DialogDescription>Donnez un nom à ce template pour le réutiliser</DialogDescription>
          </DialogHeader>
          <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Ex: Email formel développeur" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveTemplate} disabled={!newTemplateName.trim()}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
