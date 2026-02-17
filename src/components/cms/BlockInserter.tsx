import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Blocks, Loader2, Code } from "lucide-react";

interface BlockInserterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string, css: string) => void;
}

export const BlockInserter: React.FC<BlockInserterProps> = ({ open, onOpenChange, onInsert }) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["cms-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_blocks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const categories = ["all", ...new Set(blocks?.map((b: any) => b.category || "general") || [])];

  const filtered = blocks?.filter((b: any) => {
    const catMatch = categoryFilter === "all" || (b.category || "general") === categoryFilter;
    const searchMatch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const handleInsert = (block: any) => {
    // Replace editable params with default values
    let html = block.html_template || "";
    const params = (block.editable_params || []) as any[];
    params.forEach((p: any) => {
      html = html.split(`{{${p.name}}}`).join(p.default || "");
    });
    onInsert(html, block.css || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Blocks className="h-5 w-5" /> Blocs réutilisables
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un bloc..."
            className="pl-9 h-9 rounded-lg"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                categoryFilter === cat
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "Tous" : cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Blocks className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun bloc disponible</p>
              <p className="text-xs mt-1">Créez des blocs dans l'onglet Blocs du CMS</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              {filtered.map((block: any) => (
                <div
                  key={block.id}
                  className="group rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all"
                  onClick={() => handleInsert(block)}
                >
                  {/* Preview */}
                  <div className="h-32 bg-muted/30 border-b border-border/30 overflow-hidden relative">
                    {block.thumbnail_url ? (
                      <img src={block.thumbnail_url} alt={block.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Code className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{block.name}</p>
                      <Badge variant="outline" className="text-[9px] rounded-md border-0 bg-muted/60 shrink-0">
                        {block.category || "general"}
                      </Badge>
                    </div>
                    {block.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{block.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
