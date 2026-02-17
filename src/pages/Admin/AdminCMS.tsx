import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Globe, Clock, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const totalPages = pages?.length || 0;
  const publishedCount = pages?.filter((p: any) => p.status === "published").length || 0;
  const draftCount = pages?.filter((p: any) => p.status === "draft").length || 0;

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHrs < 24) return `Il y a ${diffHrs}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contenu</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez vos articles et pages</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/admin/cms/blocks/new")} variant="outline" className="gap-2 rounded-xl">
              <Blocks className="h-4 w-4" /> Nouveau bloc
            </Button>
            <Button onClick={() => navigate("/admin/cms/new")} className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
              <Plus className="h-4 w-4" /> Nouvelle page
            </Button>
          </div>
        </div>
        {/* Stats bar - bento style */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: totalPages, icon: FileText, color: "text-foreground" },
            { label: "Publiés", value: publishedCount, icon: Globe, color: "text-emerald-500" },
            { label: "Brouillons", value: draftCount, icon: Clock, color: "text-amber-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters - pill style */}
        <div className="flex gap-1.5 p-1 bg-muted/40 rounded-xl w-fit">
          {(["all", "blog", "page"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                filter === f 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Tout" : f === "blog" ? "Articles" : "Pages"}
              {f !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {pages?.filter((p: any) => p.page_type === f).length || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : !filtered?.length ? (
          <Card className="border-dashed border-2 border-border/50 bg-transparent">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Aucun contenu</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Créez votre première page ou article</p>
              <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate("/admin/cms/new")}>
                <Plus className="h-4 w-4 mr-2" /> Créer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((page: any) => (
              <div
                key={page.id}
                className="group relative rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:border-primary/30 hover:bg-card/70 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/admin/cms/${page.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-semibold text-foreground truncate text-[15px]">{page.title}</h3>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] shrink-0 rounded-md px-1.5 py-0 border-0 ${
                          page.page_type === "page" 
                            ? "bg-violet-500/10 text-violet-400" 
                            : "bg-sky-500/10 text-sky-400"
                        }`}
                      >
                        {page.page_type === "page" ? "Page" : "Blog"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {page.status === "published" ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                        )}
                        {page.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{getViewUrl(page)}</span>
                      <span className="opacity-40">·</span>
                      <span>{formatRelativeDate(page.updated_at || page.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {page.status === "published" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" size="icon" 
                            className="h-8 w-8 rounded-lg"
                            onClick={(e) => { e.stopPropagation(); window.open(getViewUrl(page), "_blank"); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Voir</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/cms/${page.id}`); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Modifier</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(page.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Supprimer</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette page ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="rounded-xl bg-destructive hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
