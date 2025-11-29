import React, { useState, useMemo } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { SECTOR_CATEGORIES } from "@/lib/sector-categories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SectorGridProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  onValidate: () => void;
}

export const SectorGrid = ({ selectedCodes, onCodesChange, onValidate }: SectorGridProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const selectedCount = useMemo(() => {
    const uniqueSectors = new Set<string>();
    selectedCodes.forEach(code => {
      SECTOR_CATEGORIES.forEach(cat => {
        cat.subcategories.forEach(sub => {
          if (sub.codes.includes(code)) {
            uniqueSectors.add(`${cat.id}-${sub.label}`);
          }
        });
      });
    });
    return uniqueSectors.size;
  }, [selectedCodes]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleSubcategory = (codes: string[]) => {
    const allSelected = codes.every(code => selectedCodes.includes(code));
    if (allSelected) {
      onCodesChange(selectedCodes.filter(code => !codes.includes(code)));
    } else {
      const newCodes = [...selectedCodes];
      codes.forEach(code => {
        if (!newCodes.includes(code)) {
          newCodes.push(code);
        }
      });
      onCodesChange(newCodes);
    }
  };

  const toggleAllInCategory = (categoryId: string) => {
    const category = SECTOR_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const allCodes = category.subcategories.flatMap(sub => sub.codes);
    const allSelected = allCodes.every(code => selectedCodes.includes(code));
    
    if (allSelected) {
      onCodesChange(selectedCodes.filter(code => !allCodes.includes(code)));
    } else {
      const newCodes = [...selectedCodes];
      allCodes.forEach(code => {
        if (!newCodes.includes(code)) {
          newCodes.push(code);
        }
      });
      onCodesChange(newCodes);
    }
  };

  const getCategorySelectedCount = (categoryId: string) => {
    const category = SECTOR_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return 0;
    
    let count = 0;
    category.subcategories.forEach(sub => {
      if (sub.codes.some(code => selectedCodes.includes(code))) {
        count++;
      }
    });
    return count;
  };

  const clearSelection = () => {
    onCodesChange([]);
    setExpandedCategory(null);
  };

  return (
    <div className="space-y-4">
      {/* Sector Grid - Compact for 1920x1080 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {SECTOR_CATEGORIES.map((category, index) => {
          const isExpanded = expandedCategory === category.id;
          const selectedInCategory = getCategorySelectedCount(category.id);
          const hasSelection = selectedInCategory > 0;
          
          return (
            <div
              key={category.id}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "w-full p-3 rounded-xl border transition-all duration-300 text-left",
                  "hover:border-primary/50 hover:shadow-md",
                  hasSelection 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-card border-border/50",
                  isExpanded && "ring-2 ring-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">{category.icon}</span>
                  {hasSelection && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {selectedInCategory}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground truncate">
                  {category.label}
                </p>
                <ChevronDown 
                  className={cn(
                    "h-3 w-3 text-muted-foreground mt-1 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Expanded dropdown */}
              {isExpanded && (
                <div className="absolute z-50 top-full left-0 mt-2 w-64 p-3 rounded-xl bg-card border border-border shadow-xl animate-scale-in">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <span className="text-sm font-medium">{category.label}</span>
                    <button
                      onClick={() => toggleAllInCategory(category.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {getCategorySelectedCount(category.id) === category.subcategories.length 
                        ? "Tout désélectionner" 
                        : "Tout sélectionner"}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {category.subcategories.map((sub, subIndex) => {
                      const isSelected = sub.codes.some(code => selectedCodes.includes(code));
                      return (
                        <button
                          key={subIndex}
                          onClick={() => toggleSubcategory(sub.codes)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200",
                            isSelected 
                              ? "bg-primary/15 text-primary" 
                              : "hover:bg-accent"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            isSelected 
                              ? "bg-primary border-primary" 
                              : "border-border"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{sub.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{sub.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Close expanded on click outside */}
      {expandedCategory && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setExpandedCategory(null)}
        />
      )}

      {/* Validation Bar */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {selectedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer ({selectedCount})
          </Button>
        )}
        <Button
          onClick={onValidate}
          disabled={selectedCount === 0}
          size="lg"
          className="px-8 btn-premium"
        >
          Valider {selectedCount > 0 && `${selectedCount} secteur${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
};
