import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Brain, Mail, FileText, Lightbulb, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface AIConfig {
  id: string;
  config_type: string;
  system_prompt: string;
  tone_guidelines: string | null;
  admin_notes: string | null;
  is_active: boolean;
  updated_at: string;
}

const ConfigEditor = ({
  configType,
  title,
  description,
  icon: Icon,
  noteText,
}: {
  configType: string;
  title: string;
  description: string;
  icon: React.ElementType;
  noteText: string;
}) => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [toneGuidelines, setToneGuidelines] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [configType]);

  const loadConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_generation_config" as any)
      .select("*")
      .eq("config_type", configType)
      .maybeSingle();

    if (error) {
      toast.error("Erreur chargement config");
    } else if (data) {
      const c = data as AIConfig;
      setConfig(c);
      setSystemPrompt(c.system_prompt || "");
      setToneGuidelines(c.tone_guidelines || "");
      setAdminNotes(c.admin_notes || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        system_prompt: systemPrompt,
        tone_guidelines: toneGuidelines || null,
        admin_notes: adminNotes || null,
        updated_by: user?.id,
      };

      if (config?.id) {
        const { error } = await supabase
          .from("ai_generation_config" as any)
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_generation_config" as any)
          .insert({ ...payload, config_type: configType });
        if (error) throw error;
      }

      toast.success("Prompt sauvegardé ✓");
      loadConfig();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config?.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Mis à jour : {new Date(config.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={loadConfig}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* System Prompt */}
          <div className="space-y-2">
            <Label className="font-semibold">System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="font-mono text-sm min-h-[520px] resize-y leading-relaxed"
              placeholder="Entrez le system prompt..."
            />
          </div>

          {/* Tone Guidelines */}
          <div className="space-y-2">
            <Label className="font-semibold">Consignes de ton</Label>
            <Textarea
              value={toneGuidelines}
              onChange={(e) => setToneGuidelines(e.target.value)}
              className="min-h-[80px] resize-y text-sm"
              placeholder="Décris les règles de ton appliquées à ce prompt..."
            />
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label className="font-semibold">Notes admin</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="min-h-[80px] resize-y text-sm"
              placeholder="Notes internes, contexte, historique des modifications..."
            />
          </div>

          {/* Info note */}
          <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{noteText}</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminAIGeneration = () => {
  const [totalProfessions, setTotalProfessions] = useState(0);
  const [enrichedProfessions, setEnrichedProfessions] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { count: total } = await supabase
      .from("ats_professions")
      .select("*", { count: "exact", head: true })
      .eq("profession_status", "active");

    const { count: enriched } = await supabase
      .from("ats_professions" as any)
      .select("*", { count: "exact", head: true })
      .eq("profession_status", "active")
      .not("sector_description", "is", null)
      .not("recruiter_expectations", "is", null);

    setTotalProfessions(total || 0);
    setEnrichedProfessions(enriched || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prompts IA</h1>
          <p className="text-muted-foreground text-sm">Pilotez les instructions envoyées à l'IA lors de la génération</p>
        </div>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="mb-6">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Objet &amp; Email
          </TabsTrigger>
          <TabsTrigger value="cover_letter" className="gap-2">
            <FileText className="h-4 w-4" />
            Lettre de motivation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <ConfigEditor
            configType="email_subject"
            title="System Prompt — Génération d'emails"
            description="Utilisé par l'Edge Function generate-personalized-emails"
            icon={Mail}
            noteText="Ce prompt est utilisé par l'Edge Function generate-personalized-emails. Les instructions de type d'objet (corporate/value/manager/question) et de ton (formal/balanced/direct/soft) sont ajoutées automatiquement par le système. Le contexte sectoriel ATS et les exemples validés sont également injectés dynamiquement."
          />
        </TabsContent>

        <TabsContent value="cover_letter">
          <ConfigEditor
            configType="cover_letter"
            title="System Prompt — Lettres de motivation"
            description="Utilisé par l'Edge Function generate-cover-letter"
            icon={FileText}
            noteText="Ce prompt est utilisé par l'Edge Function generate-cover-letter. Les données du candidat (CV, profil) et de l'entreprise (scraping web) sont injectées automatiquement. Le contexte sectoriel ATS enrichit le prompt si un métier correspondant est trouvé."
          />
        </TabsContent>
      </Tabs>

      {/* Sector Knowledge Base section — always visible */}
      <Separator />
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Base de connaissances sectorielles</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  L'IA utilise aussi les connaissances sectorielles pour enrichir son contexte. Gérez-les ici :
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {enrichedProfessions} métiers enrichis
                  </Badge>
                  <span className="text-xs text-muted-foreground">sur {totalProfessions} actifs</span>
                  {totalProfessions > 0 && (
                    <Badge variant={enrichedProfessions / totalProfessions > 0.5 ? "default" : "outline"} className="text-xs">
                      {Math.round((enrichedProfessions / totalProfessions) * 100)}% complétude
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/admin/sector-insights">
                <ExternalLink className="h-4 w-4 mr-2" />
                Gérer les connaissances sectorielles
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
