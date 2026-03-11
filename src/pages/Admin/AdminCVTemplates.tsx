import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, LayoutTemplate, Copy } from "lucide-react";

export const AdminCVTemplates = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["cv-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cv_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cv_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template supprimé" });
      qc.invalidateQueries({ queryKey: ["cv-templates"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const tpl = templates.find(t => t.id === id);
      if (!tpl) return;
      const { error } = await supabase.from("cv_templates").insert({
        name: `${tpl.name} (copie)`,
        html_template: tpl.html_template,
        css_styles: tpl.css_styles,
        sector: tpl.sector,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template dupliqué" });
      qc.invalidateQueries({ queryKey: ["cv-templates"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const isCanvasV2 = (html: string) => {
    try { return JSON.parse(html)?.version === "canvas-v2"; } catch { return false; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-primary" />
            Templates CV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Créez et gérez les templates de CV disponibles pour les utilisateurs</p>
        </div>
        <Button onClick={() => navigate("/admin/cv-templates/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Aucun template</p>
          <p className="text-sm mt-1 mb-4">Créez votre premier template CV avec l'éditeur visuel</p>
          <Button onClick={() => navigate("/admin/cv-templates/new")}>
            <Plus className="h-4 w-4 mr-2" /> Créer un template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow group">
              {/* Thumbnail or placeholder */}
              <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
                {tpl.thumbnail_url ? (
                  <img src={tpl.thumbnail_url} alt={tpl.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground gap-2">
                    <LayoutTemplate className="h-10 w-10 opacity-30" />
                    <span className="text-xs opacity-50">Aperçu indisponible</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/admin/cv-templates/${tpl.id}`)}
                    className="p-1.5 rounded-md bg-white/90 text-foreground shadow-sm hover:bg-white"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => duplicateMutation.mutate(tpl.id)}
                    className="p-1.5 rounded-md bg-white/90 text-foreground shadow-sm hover:bg-white"
                    title="Dupliquer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Supprimer ce template ?")) deleteMutation.mutate(tpl.id); }}
                    className="p-1.5 rounded-md bg-white/90 text-destructive shadow-sm hover:bg-white"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{tpl.name}</p>
                  <div className="flex gap-1 shrink-0">
                    {isCanvasV2(tpl.html_template) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Canvas</Badge>
                    )}
                    <Badge variant={tpl.is_active ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                      {tpl.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tpl.sector || "custom"}</p>
                <Button
                  variant="outline" size="sm" className="w-full mt-3 h-7 text-xs"
                  onClick={() => navigate(`/admin/cv-templates/${tpl.id}`)}
                >
                  <Pencil className="h-3 w-3 mr-1.5" />
                  Modifier
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
