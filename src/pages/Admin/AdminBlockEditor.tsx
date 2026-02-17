import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, Eye } from "lucide-react";

const CATEGORIES = ["hero", "section", "cta", "card", "footer", "general"];

interface EditableParam {
  name: string;
  type: "text" | "color" | "url" | "select";
  default: string;
  options?: string[];
}

export const AdminBlockEditor = () => {
  const { blockId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = blockId === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [category, setCategory] = useState("general");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [editableParams, setEditableParams] = useState<EditableParam[]>([]);

  const { data: block, isLoading } = useQuery({
    queryKey: ["cms-block", blockId],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("cms_blocks")
        .select("*")
        .eq("id", blockId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (block) {
      setName(block.name);
      setDescription(block.description || "");
      setHtmlTemplate(block.html_template);
      setCss(block.css || "");
      setJs(block.js || "");
      setCategory(block.category || "general");
      setThumbnailUrl(block.thumbnail_url || "");
      setEditableParams((block.editable_params as any) || []);
    }
  }, [block]);

  const getPreviewHtml = () => {
    let html = htmlTemplate;
    editableParams.forEach((p) => {
      html = html.split(`{{${p.name}}}`).join(p.default || "");
    });
    return `<style>${css}</style>${html}${js ? `<script>${js}</script>` : ""}`;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const payload = {
        name,
        description: description || null,
        html_template: htmlTemplate,
        css: css || null,
        js: js || null,
        category,
        thumbnail_url: thumbnailUrl || null,
        editable_params: editableParams as any,
        created_by: user.id,
      };

      if (isNew) {
        const { error } = await supabase.from("cms_blocks").insert(payload);
        if (error) throw error;
      } else {
        const { created_by, ...updatePayload } = payload;
        const { error } = await supabase.from("cms_blocks").update(updatePayload).eq("id", blockId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-blocks"] });
      toast.success("Bloc enregistré");
      if (isNew) navigate("/admin/cms");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const addParam = () => {
    setEditableParams([...editableParams, { name: "", type: "text", default: "" }]);
  };

  const updateParam = (index: number, field: keyof EditableParam, value: string) => {
    const updated = [...editableParams];
    (updated[index] as any)[field] = value;
    setEditableParams(updated);
  };

  const removeParam = (index: number) => {
    setEditableParams(editableParams.filter((_, i) => i !== index));
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cms")} className="gap-1.5 rounded-lg h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Button>
          <div className="h-4 w-px bg-border/50" />
          <span className="text-sm text-muted-foreground">{isNew ? "Nouveau bloc" : name}</span>
        </div>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-8 text-xs rounded-lg shadow-lg shadow-primary/20">
          <Save className="h-3 w-3 mr-1" /> Enregistrer
        </Button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: code editors */}
        <div className="w-1/2 border-r border-border/40 overflow-y-auto p-4 space-y-4">
          <div>
            <Label className="text-xs">Nom du bloc</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 rounded-lg" placeholder="Hero Banner" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-9 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 h-9 rounded-lg" placeholder="Courte description..." />
            </div>
          </div>

          <div>
            <Label className="text-xs">HTML Template</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Utilisez {"{{nom_param}}"} pour les paramètres éditables</p>
            <Textarea value={htmlTemplate} onChange={(e) => setHtmlTemplate(e.target.value)} className="mt-1 font-mono text-xs min-h-[200px] rounded-lg" placeholder='<div class="hero">...</div>' />
          </div>

          <div>
            <Label className="text-xs">CSS</Label>
            <Textarea value={css} onChange={(e) => setCss(e.target.value)} className="mt-1 font-mono text-xs min-h-[120px] rounded-lg" placeholder=".hero { ... }" />
          </div>

          <div>
            <Label className="text-xs">JavaScript (optionnel)</Label>
            <Textarea value={js} onChange={(e) => setJs(e.target.value)} className="mt-1 font-mono text-xs min-h-[80px] rounded-lg" placeholder="// JS optionnel" />
          </div>

          {/* Editable params */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Paramètres éditables</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={addParam}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </div>
            {editableParams.map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 p-2 bg-muted/30 rounded-lg">
                <Input value={p.name} onChange={(e) => updateParam(i, "name", e.target.value)} placeholder="nom" className="h-8 text-xs rounded-md flex-1" />
                <Select value={p.type} onValueChange={(v) => updateParam(i, "type", v as any)}>
                  <SelectTrigger className="h-8 text-xs rounded-md w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texte</SelectItem>
                    <SelectItem value="color">Couleur</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={p.default} onChange={(e) => updateParam(i, "default", e.target.value)} placeholder="défaut" className="h-8 text-xs rounded-md flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeParam(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs">URL miniature (optionnel)</Label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="mt-1 h-9 rounded-lg" placeholder="https://..." />
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-1/2 bg-muted/20 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Aperçu en temps réel</p>
          </div>
          <div className="bg-background rounded-xl border border-border/40 p-6 min-h-[300px]">
            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
          </div>
        </div>
      </div>
    </div>
  );
};
