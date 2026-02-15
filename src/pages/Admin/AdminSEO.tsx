import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Search, Globe, ChevronDown, ChevronUp } from "lucide-react";

const SITE_PAGES = [
  { path: "/", label: "Accueil (Landing)" },
  { path: "/pricing", label: "Tarifs" },
  { path: "/login", label: "Connexion" },
  { path: "/register", label: "Inscription" },
  { path: "/help", label: "Aide" },
  { path: "/privacy-policy", label: "Politique de confidentialité" },
  { path: "/terms-of-service", label: "CGU" },
  { path: "/mentions-legales", label: "Mentions légales" },
];

interface SEOData {
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
}

export const AdminSEO = () => {
  const queryClient = useQueryClient();
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, SEOData>>({});

  const { data: seoSettings, isLoading } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (seoSettings) {
      const mapped: Record<string, SEOData> = {};
      seoSettings.forEach((s: any) => {
        mapped[s.page_path] = {
          meta_title: s.meta_title || "",
          meta_description: s.meta_description || "",
          og_title: s.og_title || "",
          og_description: s.og_description || "",
          og_image: s.og_image || "",
          canonical_url: s.canonical_url || "",
        };
      });
      setFormData(mapped);
    }
  }, [seoSettings]);

  const getPageData = (path: string): SEOData =>
    formData[path] || { meta_title: "", meta_description: "", og_title: "", og_description: "", og_image: "", canonical_url: "" };

  const updateField = (path: string, field: keyof SEOData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [path]: { ...getPageData(path), [field]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (path: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const pageData = getPageData(path);
      const existing = seoSettings?.find((s: any) => s.page_path === path);

      if (existing) {
        const { error } = await supabase
          .from("seo_settings")
          .update({ ...pageData, updated_by: user?.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seo_settings")
          .insert({ page_path: path, ...pageData, updated_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      toast.success("SEO mis à jour");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SEO & Marketing</h1>
        <p className="text-muted-foreground">Gérez les balises meta de chaque page du site</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {SITE_PAGES.map(({ path, label }) => {
            const data = getPageData(path);
            const isExpanded = expandedPage === path;
            const hasData = seoSettings?.some((s: any) => s.page_path === path);

            return (
              <Card key={path} className="overflow-hidden">
                <button
                  onClick={() => setExpandedPage(isExpanded ? null : path)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-sm text-muted-foreground">{path}</span>
                    {hasData && <Badge variant="secondary" className="text-xs">Configuré</Badge>}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Meta Title</Label>
                        <Input value={data.meta_title} onChange={(e) => updateField(path, "meta_title", e.target.value)} placeholder="Titre SEO" />
                        <p className="text-xs text-muted-foreground mt-1">{data.meta_title.length}/60</p>
                      </div>
                      <div>
                        <Label>OG Title</Label>
                        <Input value={data.og_title} onChange={(e) => updateField(path, "og_title", e.target.value)} placeholder="Titre Open Graph" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Meta Description</Label>
                        <Textarea value={data.meta_description} onChange={(e) => updateField(path, "meta_description", e.target.value)} placeholder="Description pour les moteurs de recherche" rows={2} />
                        <p className="text-xs text-muted-foreground mt-1">{data.meta_description.length}/160</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>OG Description</Label>
                        <Textarea value={data.og_description} onChange={(e) => updateField(path, "og_description", e.target.value)} placeholder="Description Open Graph" rows={2} />
                      </div>
                      <div>
                        <Label>OG Image</Label>
                        <Input value={data.og_image} onChange={(e) => updateField(path, "og_image", e.target.value)} placeholder="https://..." />
                      </div>
                      <div>
                        <Label>Canonical URL</Label>
                        <Input value={data.canonical_url} onChange={(e) => updateField(path, "canonical_url", e.target.value)} placeholder="https://..." />
                      </div>
                    </div>

                    {/* Google Preview */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Search className="h-3 w-3" /> Aperçu Google</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">
                        {data.meta_title || label}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-500">votresite.com{path}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {data.meta_description || "Aucune description définie"}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => saveMutation.mutate(path)} disabled={saveMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" /> Enregistrer
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
