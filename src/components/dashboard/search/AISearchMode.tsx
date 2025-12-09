import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MegaCategory {
  label: string;
  description: string;
  codes: string[];
}

interface AIResponse {
  question?: string;
  options?: MegaCategory[];
  clarification?: string;
  error?: string;
}

interface AISearchModeProps {
  onSectorsValidated: (codes: string[]) => void;
}

export const AISearchMode = ({ onSectorsValidated }: AISearchModeProps) => {
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MegaCategory | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    setAiResponse(null);
    setSelectedCategory(null);
    setShowOptions(false);

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
        setAiResponse({ clarification: data.clarification });
      } else if (data.question && data.options) {
        setAiResponse(data);
        setShowOptions(true);
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

  const handleCategorySelect = (category: MegaCategory) => {
    setSelectedCategory(category);
    setShowOptions(false);
  };

  const handleValidate = () => {
    if (selectedCategory && selectedCategory.codes.length > 0) {
      onSectorsValidated(selectedCategory.codes);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Décrivez votre recherche et l'IA vous propose des catégories d'entreprises</span>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Ex: marketing, développement web, finance, design..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="pl-12 h-14 text-lg bg-card border-border/50 focus:border-primary/50 rounded-xl"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            size="lg" 
            disabled={isLoading || !keyword.trim()}
            className="h-14 px-8 btn-premium rounded-xl"
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
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 animate-ping opacity-30">
              <Loader2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">L'IA analyse votre recherche...</p>
        </div>
      )}

      {/* Clarification Message */}
      {aiResponse?.clarification && !isLoading && (
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
          <p className="text-amber-200 text-center text-lg">
            💡 {aiResponse.clarification}
          </p>
        </div>
      )}

      {/* AI Options / Mega Categories */}
      {showOptions && aiResponse?.options && !isLoading && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-muted-foreground text-center">
            {aiResponse.question}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {aiResponse.options.map((category, index) => (
              <button
                key={index}
                onClick={() => handleCategorySelect(category)}
                className="w-full text-left p-6 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 group"
              >
                <span className="text-3xl mb-4 block">
                  {index === 0 ? "🎯" : index === 1 ? "🚀" : "💼"}
                </span>
                <h4 className="font-semibold text-foreground mb-2 text-lg">{category.label}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>
                <div className="mt-4 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{category.codes.length} secteurs inclus</span>
                  <ArrowRight className="ml-2 h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Category Confirmation */}
      {selectedCategory && !isLoading && (
        <div className="space-y-6 animate-slide-in-right">
          <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary font-medium">Catégorie sélectionnée :</p>
                <p className="text-foreground text-lg font-semibold mt-1">{selectedCategory.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedCategory.description}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-xs text-muted-foreground">
                Cette catégorie inclut <span className="text-primary font-medium">{selectedCategory.codes.length} secteurs d'activité</span> diversifiés pour maximiser vos opportunités
              </p>
            </div>
          </div>

          {/* Validate Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleValidate}
              size="lg"
              className="px-10 h-14 text-base btn-premium rounded-xl"
            >
              Rechercher des entreprises
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
