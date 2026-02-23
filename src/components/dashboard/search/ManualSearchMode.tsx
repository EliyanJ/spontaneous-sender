import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronRight, Search, Loader2, RotateCcw, Users, Filter } from "lucide-react";
import { SECTOR_CATEGORIES } from "@/lib/sector-categories";
import { RegionSearch } from "@/components/ui/region-search";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ManualSearchModeProps {
  onSearch: (codes: string[], locations: string[], employees: string, count: string) => void;
  loading?: boolean;
}

export const ManualSearchMode = ({ onSearch, loading }: ManualSearchModeProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [minEmployees, setMinEmployees] = useState("5-100");
  const [minResults, setMinResults] = useState("20");

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubcategory = (codes: string[]) => {
    const allSelected = codes.every(code => selectedCodes.includes(code));
    if (allSelected) {
      setSelectedCodes(selectedCodes.filter(code => !codes.includes(code)));
    } else {
      const newCodes = [...selectedCodes];
      codes.forEach(code => {
        if (!newCodes.includes(code)) newCodes.push(code);
      });
      setSelectedCodes(newCodes);
    }
  };

  const getCategorySelectedCount = (categoryId: string) => {
    const category = SECTOR_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return 0;
    let count = 0;
    category.subcategories.forEach(sub => {
      if (sub.codes.some(code => selectedCodes.includes(code))) count++;
    });
    return count;
  };

  const totalSelectedSectors = SECTOR_CATEGORIES.reduce((acc, cat) => {
    return acc + getCategorySelectedCount(cat.id);
  }, 0);

  const clearSelection = () => {
    setSelectedCodes([]);
    setExpandedCategories([]);
    setVilles([]);
    setMinEmployees("5-100");
    setMinResults("20");
  };

  const handleSubmit = () => {
    if (selectedCodes.length === 0 && villes.length === 0) return;
    onSearch(selectedCodes, villes, minEmployees, minResults);
  };

  return (
    <div className="rounded-2xl bg-card/85 backdrop-blur-xl border border-border/50 overflow-hidden animate-fade-in">
      {/* Teal top border accent */}
      <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-400" />
      
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10">
            <Filter className="h-4 w-4 text-teal-400" />
          </div>
          <h3 className="font-semibold text-sm">Filtres Manuels</h3>
          {totalSelectedSectors > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-400 border-teal-500/20">
              {totalSelectedSectors}
            </Badge>
          )}
        </div>

        {/* Sector Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Secteur d'activité</Label>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
            {SECTOR_CATEGORIES.map((category) => {
              const isExpanded = expandedCategories.includes(category.id);
              const selectedInCategory = getCategorySelectedCount(category.id);
              
              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                        "hover:border-primary/50 hover:bg-accent/50",
                        selectedInCategory > 0
                          ? "bg-primary/10 border-primary/50"
                          : "bg-background/50 border-border/50"
                      )}
                    >
                      <span className="text-sm">{category.icon}</span>
                      <span className="flex-1 font-medium truncate">{category.label}</span>
                      {selectedInCategory > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                          {selectedInCategory}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-1 ml-3 pl-3 border-l border-border/50 space-y-0.5">
                      {category.subcategories.map((sub, subIndex) => {
                        const isSelected = sub.codes.some(code => selectedCodes.includes(code));
                        return (
                          <button
                            key={subIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubcategory(sub.codes);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 p-1.5 rounded-md text-left text-xs transition-all",
                              isSelected ? "bg-primary/15 text-foreground" : "hover:bg-accent/50"
                            )}
                          >
                            <div className={cn(
                              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                              isSelected ? "bg-primary border-primary" : "border-border"
                            )}>
                              {isSelected && <Check className="h-2 w-2 text-primary-foreground" />}
                            </div>
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Localisation</Label>
          <RegionSearch
            value={villes}
            onChange={setVilles}
            placeholder="Paris, Lyon, 75..."
          />
        </div>

        {/* Employee Size */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            Taille
          </Label>
          <Select value={minEmployees} onValueChange={setMinEmployees}>
            <SelectTrigger className="h-9 bg-background/50 border-border/50 rounded-lg text-xs">
              <SelectValue placeholder="5-100" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="5-100">5-100 (recommandé)</SelectItem>
              <SelectItem value="5-50">5-50 (PME)</SelectItem>
              <SelectItem value="10-100">10-100</SelectItem>
              <SelectItem value="50-200">50-200 (ETI)</SelectItem>
              <SelectItem value="0-500">Tous (0-500)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || (selectedCodes.length === 0 && villes.length === 0)}
            className="flex-1 h-9 rounded-xl text-xs font-medium"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Search className="h-3.5 w-3.5 mr-1.5" />
            )}
            Appliquer les filtres
          </Button>
        </div>
        
        {(selectedCodes.length > 0 || villes.length > 0) && (
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
};
