import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bot, Save, RotateCcw, Brain, MessageSquare, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rapide)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (économique)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (précis)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (next-gen)" },
];

export const AdminChatbot = () => {
  const [configId, setConfigId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [isActive, setIsActive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chatbot_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Erreur chargement config chatbot");
      console.error(error);
    } else if (data) {
      setConfigId(data.id);
      setSystemPrompt(data.system_prompt);
      setKnowledgeBase(data.knowledge_base || "");
      setModel(data.model || "google/gemini-2.5-flash");
      setIsActive(data.is_active ?? true);
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  };

  const saveField = async (field: string, value: any) => {
    if (!configId) return;
    setSaving(field);
    const { error } = await supabase
      .from("chatbot_config")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", configId);

    if (error) {
      toast.error("Erreur de sauvegarde");
      console.error(error);
    } else {
      toast.success("Sauvegardé !");
      setUpdatedAt(new Date().toISOString());
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!configId) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Aucune configuration chatbot trouvée. Contactez un développeur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Chatbot Assistant
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez le prompt, la base de connaissances et les paramètres du chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Actif" : "Inactif"}
          </Badge>
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
              Modifié le {new Date(updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Prompt Système
          </CardTitle>
          <CardDescription>
            Définit le comportement, le ton et les règles de réponse du chatbot. C'est le "cerveau" de l'assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Entrez le prompt système..."
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveField("system_prompt", systemPrompt)}
              disabled={saving === "system_prompt"}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "system_prompt" ? "Sauvegarde..." : "Sauvegarder le prompt"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            Base de Connaissances
          </CardTitle>
          <CardDescription>
            Informations contextuelles injectées dans chaque réponse : FAQ, tarifs actualisés, nouvelles fonctionnalités, etc. Mettez à jour ici pour que le chatbot ait toujours les bonnes infos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="# FAQ&#10;&#10;Q: Comment ça marche ?&#10;R: ...&#10;&#10;# TARIFS&#10;&#10;- Plan Gratuit : 0€&#10;- Plan Standard : 14€/mois"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveField("knowledge_base", knowledgeBase)}
              disabled={saving === "knowledge_base"}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "knowledge_base" ? "Sauvegarde..." : "Sauvegarder la base"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Modèle IA</Label>
              <p className="text-xs text-muted-foreground">Le modèle utilisé pour générer les réponses</p>
            </div>
            <Select value={model} onValueChange={(v) => { setModel(v); saveField("model", v); }}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Chatbot actif</Label>
              <p className="text-xs text-muted-foreground">Désactiver le chatbot masque le widget pour les utilisateurs</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => { setIsActive(v); saveField("is_active", v); }}
            />
          </div>

          {/* Reset */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label className="font-medium text-destructive">Réinitialiser</Label>
              <p className="text-xs text-muted-foreground">Recharger la config depuis la base de données</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadConfig}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Recharger
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
