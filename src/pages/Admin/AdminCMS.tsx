import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AdminCMS = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "blog" | "page">("all");

  const { data: pages, isLoading } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success("Page supprimée");
      setDeleteId(null);
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const filtered = pages?.filter((p: any) => filter === "all" || p.page_type === filter);

  const getViewUrl = (page: any) => {
    const type = page.page_type || "blog";
    return type === "page" ? `/p/${page.slug}` : `/blog/${page.slug}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CMS - Pages</h1>
          <p className="text-muted-foreground">Gérez vos articles de blog et pages personnalisées</p>
        </div>
        <Button onClick={() => navigate("/admin/cms/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvelle page
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "blog", "page"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Tout" : f === "blog" ? "Articles" : "Pages"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune page créée pour le moment</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/cms/new")}>
              Créer votre première page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((page: any) => (
            <Card key={page.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{page.title}</h3>
                    <Badge variant={page.page_type === "page" ? "outline" : "secondary"} className="text-[10px] shrink-0">
                      {page.page_type === "page" ? "Page" : "Blog"}
                    </Badge>
                    <Badge variant={page.status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {page.status === "published" ? "Publié" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getViewUrl(page)} · {new Date(page.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {page.status === "published" && (
                    <Button variant="ghost" size="icon" onClick={() => window.open(getViewUrl(page), "_blank")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/cms/${page.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(page.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette page ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
