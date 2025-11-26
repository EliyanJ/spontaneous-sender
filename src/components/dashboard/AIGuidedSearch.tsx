import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SECTOR_CATEGORIES } from "@/lib/sector-categories";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AIResponse {
  question?: string;
  options?: Array<{
    label: string;
    description: string;
    codes: string[];
  }>;
  clarification?: string;
}

interface AIGuidedSearchProps {
  onSectorsSelected: (codes: string[]) => void;
}

export default function AIGuidedSearch({ onSectorsSelected }: AIGuidedSearchProps) {
  const [mode, setMode] = useState<"guided" | "advanced">("guided");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const handleKeywordSearch = async () => {
    if (!keyword.trim()) {
      toast.error("Tape un mot-clé pour commencer");
      return;
    }

    setLoading(true);
    setAiResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-sector-guide', {
        body: { keyword: keyword.trim() }
      });

      if (error) throw error;

      if (data.clarification) {
        toast.info(data.clarification);
        setAiResponse(null);
      } else {
        setAiResponse(data);
      }
    } catch (error) {
      console.error('AI Guide Error:', error);
      toast.error("Erreur lors de l'analyse. Réessaye !");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (codes: string[]) => {
    onSectorsSelected(codes);
    toast.success(`${codes.length} secteurs sélectionnés`);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubcategoryToggle = (codes: string[]) => {
    setSelectedCodes(prev => {
      const allSelected = codes.every(code => prev.includes(code));
      if (allSelected) {
        return prev.filter(code => !codes.includes(code));
      } else {
        return [...new Set([...prev, ...codes])];
      }
    });
  };

  const handleAdvancedSearch = () => {
    if (selectedCodes.length === 0) {
      toast.error("Sélectionne au moins un secteur");
      return;
    }
    onSectorsSelected(selectedCodes);
    toast.success(`${selectedCodes.length} secteurs sélectionnés`);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={mode === "guided" ? "default" : "outline"}
          onClick={() => setMode("guided")}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Recherche guidée IA
        </Button>
        <Button
          variant={mode === "advanced" ? "default" : "outline"}
          onClick={() => setMode("advanced")}
          className="flex-1"
        >
          <Search className="w-4 h-4 mr-2" />
          Tous les secteurs
        </Button>
      </div>

      {/* Guided Search Mode */}
      {mode === "guided" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: dev, marketing, finance, santé..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                  disabled={loading}
                />
                <Button onClick={handleKeywordSearch} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Question & Options */}
          {aiResponse?.question && aiResponse?.options && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">{aiResponse.question}</h3>
                <div className="space-y-3">
                  {aiResponse.options.map((option, idx) => (
                    <Card
                      key={idx}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleOptionSelect(option.codes)}
                    >
                      <CardContent className="p-4 flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{option.label}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Advanced Search Mode */}
      {mode === "advanced" && (
        <div className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 pr-4">
              {SECTOR_CATEGORIES.map((category) => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.includes(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <span className="font-medium">{category.label}</span>
                        </div>
                        <ArrowRight
                          className={`w-5 h-5 transition-transform ${
                            expandedCategories.includes(category.id) ? 'rotate-90' : ''
                          }`}
                        />
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 space-y-3">
                        {category.subcategories.map((sub, idx) => {
                          const allSelected = sub.codes.every(code => selectedCodes.includes(code));
                          return (
                            <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`${category.id}-${idx}`}
                                checked={allSelected}
                                onCheckedChange={() => handleSubcategoryToggle(sub.codes)}
                              />
                              <Label
                                htmlFor={`${category.id}-${idx}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium">{sub.label}</div>
                                <div className="text-sm text-muted-foreground">{sub.description}</div>
                              </Label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>

          <Button
            onClick={handleAdvancedSearch}
            className="w-full"
            disabled={selectedCodes.length === 0}
          >
            Valider ({selectedCodes.length} secteurs sélectionnés)
          </Button>
        </div>
      )}
    </div>
  );
}
