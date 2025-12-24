import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Loader2 } from "lucide-react";
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
}

export const AISearchMode = ({ onSectorsValidated }: AISearchModeProps) => {
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
        // Passer directement aux filtres avec les codes aléatoires
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleSearch();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
      {/* Search Bar - Centered OpenAI style */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Recherche IA intelligente</span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Tapez un domaine et l'IA sélectionnera automatiquement des secteurs diversifiés
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Ex: marketing, finance, RH..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg bg-card border-border/50 focus:border-primary/50 rounded-xl"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            size="lg" 
            disabled={isLoading || !keyword.trim()}
            className="h-12 sm:h-14 px-6 sm:px-8 btn-premium rounded-xl whitespace-nowrap shrink-0"
            tabIndex={isLoading ? -1 : 0}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Rechercher"
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-bounce" />
          </div>
          <p className="mt-4 text-muted-foreground">L'IA analyse et diversifie les secteurs...</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Sélection automatique et aléatoire en cours</p>
        </div>
      )}

      {/* Clarification Message */}
      {clarification && !isLoading && (
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
          <p className="text-amber-200 text-center text-lg">
            💡 {clarification}
          </p>
        </div>
      )}
    </div>
  );
};
