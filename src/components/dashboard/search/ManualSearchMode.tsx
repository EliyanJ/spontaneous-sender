import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ArrowRight, X } from "lucide-react";
import { SECTOR_CATEGORIES } from "@/lib/sector-categories";
import { cn } from "@/lib/utils";

interface ManualSearchModeProps {
  onSectorsValidated: (codes: string[]) => void;
}

export const ManualSearchMode = ({ onSectorsValidated }: ManualSearchModeProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleSubcategory = (codes: string[]) => {
    const allSelected = codes.every(code => selectedCodes.includes(code));
    if (allSelected) {
      setSelectedCodes(selectedCodes.filter(code => !codes.includes(code)));
    } else {
      const newCodes = [...selectedCodes];
      codes.forEach(code => {
        if (!newCodes.includes(code)) {
          newCodes.push(code);
        }
      });
      setSelectedCodes(newCodes);
    }
  };

  const toggleAllInCategory = (categoryId: string) => {
    const category = SECTOR_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const allCodes = category.subcategories.flatMap(sub => sub.codes);
    const allSelected = allCodes.every(code => selectedCodes.includes(code));
    
    if (allSelected) {
      setSelectedCodes(selectedCodes.filter(code => !allCodes.includes(code)));
    } else {
      const newCodes = [...selectedCodes];
      allCodes.forEach(code => {
        if (!newCodes.includes(code)) {
          newCodes.push(code);
        }
      });
      setSelectedCodes(newCodes);
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
    setSelectedCodes([]);
    setExpandedCategory(null);
  };

  const handleValidate = () => {
    if (selectedCodes.length > 0) {
      onSectorsValidated(selectedCodes);
    }
  };

  const totalSelectedSectors = SECTOR_CATEGORIES.reduce((acc, cat) => {
    return acc + getCategorySelectedCount(cat.id);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Sector Grid - Optimized for 1920x1080 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
                  "w-full p-4 rounded-xl border transition-all duration-300 text-left",
                  "hover:border-primary/50 hover:shadow-lg",
                  hasSelection 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-card border-border/50",
                  isExpanded && "ring-2 ring-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{category.icon}</span>
                  {hasSelection && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                      {selectedInCategory}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {category.label}
                </p>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground mt-2 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Expanded dropdown - Fixed positioning with proper z-index */}
              {isExpanded && (
                <>
                  {/* Backdrop to close on click outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setExpandedCategory(null)}
                  />
                  <div className="absolute z-50 top-full left-0 mt-2 w-72 p-4 rounded-xl bg-card border border-border shadow-2xl animate-scale-in">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">{category.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInCategory(category.id);
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {getCategorySelectedCount(category.id) === category.subcategories.length 
                          ? "Tout désélectionner" 
                          : "Tout sélectionner"}
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
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
                              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                              isSelected 
                                ? "bg-primary/15 text-foreground" 
                                : "hover:bg-accent"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                              isSelected 
                                ? "bg-primary border-primary" 
                                : "border-border"
                            )}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{sub.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{sub.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Bar */}
      <div className="flex items-center justify-center gap-4 pt-6 border-t border-border/50">
        {totalSelectedSectors > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer ({totalSelectedSectors})
          </Button>
        )}
        <Button
          onClick={handleValidate}
          disabled={totalSelectedSectors === 0}
          size="lg"
          className="px-10 h-14 text-base btn-premium rounded-xl"
        >
          Valider {totalSelectedSectors > 0 && `${totalSelectedSectors} secteur${totalSelectedSectors > 1 ? 's' : ''}`}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
