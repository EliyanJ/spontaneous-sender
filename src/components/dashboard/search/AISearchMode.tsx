import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AIResponse {
  codes?: string[];
  description?: string;
  clarification?: string;
  error?: string;
}

interface AISearchModeProps {
  onSectorsValidated: (codes: string[]) => void;
  loading?: boolean;
}

export const AISearchMode = ({ onSectorsValidated, loading: externalLoading }: AISearchModeProps) => {
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clarification, setClarification] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    setClarification(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expirée", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-sector-guide", {
        body: { keyword: keyword.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "Erreur IA", description: data.error, variant: "destructive" });
        return;
      }

      if (data.clarification) {
        setClarification(data.clarification);
      } else if (data.codes && data.codes.length > 0) {
        toast({ 
          title: `${data.codes.length} secteurs sélectionnés`, 
          description: data.description || "Secteurs diversifiés automatiquement" 
        });
        onSectorsValidated(data.codes);
      } else {
        toast({ title: "Aucun secteur trouvé", variant: "destructive" });
      }
    } catch (error) {
      console.error("AI search error:", error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de contacter l'IA. Réessayez.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || externalLoading;

  return (
    <div className="rounded-2xl bg-card/85 backdrop-blur-xl border border-border/50 p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Assistant Recherche</h3>
        </div>
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
          Beta
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Décris le type d'entreprise que tu cherches et l'IA trouvera les meilleurs secteurs.
      </p>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          placeholder="Je cherche une startup tech à Paris qui recrute des développeurs..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value.slice(0, 500))}
          disabled={busy}
          className="min-h-[100px] bg-background/50 border-border/50 rounded-xl resize-none text-sm"
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
          {keyword.length}/500
        </span>
      </div>

      {/* Clarification */}
      {clarification && !isLoading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
          💡 {clarification}
        </div>
      )}

      {/* Search Button */}
      <Button 
        onClick={handleSearch} 
        disabled={busy || !keyword.trim()}
        className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-sm font-medium"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {busy ? "Recherche en cours..." : "Lancer la recherche IA"}
      </Button>
    </div>
  );
};
