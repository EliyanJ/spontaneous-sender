import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, FileText, Info, CheckCircle } from "lucide-react";

interface GenericTemplateEditorProps {
  onTemplateChange?: (template: { subject: string; body: string }) => void;
}

const DEFAULT_TEMPLATE = {
  subject: "Candidature spontanée - {poste}",
  body: `Madame, Monsieur,

Je me permets de vous contacter afin de vous présenter ma candidature pour un poste au sein de votre entreprise {entreprise}.

Actuellement à la recherche d'une opportunité professionnelle, je suis particulièrement intéressé(e) par votre activité dans le secteur {secteur}.

Je serais ravi(e) de pouvoir échanger avec vous concernant mes compétences et votre besoin éventuel.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

Cordialement,
{prenom} {nom}`
};

const AVAILABLE_VARIABLES = [
  { key: "{entreprise}", description: "Nom de l'entreprise" },
  { key: "{ville}", description: "Ville de l'entreprise" },
  { key: "{secteur}", description: "Secteur d'activité" },
  { key: "{poste}", description: "Poste recherché (à définir)" },
  { key: "{prenom}", description: "Votre prénom" },
  { key: "{nom}", description: "Votre nom" },
];

export const GenericTemplateEditor = ({ onTemplateChange }: GenericTemplateEditorProps) => {
  const [subject, setSubject] = useState(DEFAULT_TEMPLATE.subject);
  const [body, setBody] = useState(DEFAULT_TEMPLATE.body);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load saved template on mount
  useEffect(() => {
    const loadTemplate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Cast to access the new column (types will be regenerated)
      const subscriptionData = data as any;
      if (subscriptionData?.generic_email_template) {
        const template = subscriptionData.generic_email_template as { subject?: string; body?: string };
        if (template.subject) setSubject(template.subject);
        if (template.body) setBody(template.body);
      }
    };

    loadTemplate();
  }, []);

  // Notify parent of changes
  useEffect(() => {
    onTemplateChange?.({ subject, body });
  }, [subject, body, onTemplateChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Use RPC or raw update since the column isn't in generated types yet
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          generic_email_template: { subject, body } 
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      setLastSaved(new Date());
      toast({ title: "Template sauvegardé" });
    } catch (error) {
      toast({ title: "Erreur de sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (variable: string, field: "subject" | "body") => {
    if (field === "subject") {
      setSubject(prev => prev + variable);
    } else {
      setBody(prev => prev + variable);
    }
  };

  const handleReset = () => {
    setSubject(DEFAULT_TEMPLATE.subject);
    setBody(DEFAULT_TEMPLATE.body);
  };

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Template d'email générique
            </CardTitle>
            <CardDescription>
              Ce template sera utilisé pour tous vos emails de candidature
            </CardDescription>
          </div>
          {lastSaved && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Sauvegardé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="generic-subject">Objet de l'email</Label>
          <Input
            id="generic-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Candidature spontanée..."
            className="bg-background"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label htmlFor="generic-body">Corps de l'email</Label>
          <Textarea
            id="generic-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Madame, Monsieur..."
            rows={10}
            className="bg-background font-mono text-sm"
          />
        </div>

        {/* Variables Info */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Variables disponibles
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => handleInsertVariable(v.key, "body")}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title={v.description}
              >
                <code>{v.key}</code>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez sur une variable pour l'insérer dans le corps de l'email
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder le template
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
