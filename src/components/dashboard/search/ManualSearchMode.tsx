import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronRight, ArrowRight, X } from "lucide-react";
import { SECTOR_CATEGORIES } from "@/lib/sector-categories";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ManualSearchModeProps {
  onSectorsValidated: (codes: string[]) => void;
}

export const ManualSearchMode = ({ onSectorsValidated }: ManualSearchModeProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

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
    setExpandedCategories([]);
  };

  const handleValidate = () => {
    if (selectedCodes.length > 0) {
      onSectorsValidated(selectedCodes);
    }
  };

  const totalSelectedSectors = SECTOR_CATEGORIES.reduce((acc, cat) => {
    return acc + getCategorySelectedCount(cat.id);
  }, 0);

  // Split categories into 3 columns for optimal display
  const columnsCount = 3;
  const categoriesPerColumn = Math.ceil(SECTOR_CATEGORIES.length / columnsCount);
  const columns = Array.from({ length: columnsCount }, (_, i) =>
    SECTOR_CATEGORIES.slice(i * categoriesPerColumn, (i + 1) * categoriesPerColumn)
  );

  return (
    <div className="space-y-6">
      {/* Categories in 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((columnCategories, colIndex) => (
          <div key={colIndex} className="space-y-2">
            {columnCategories.map((category, index) => {
              const isExpanded = expandedCategories.includes(category.id);
              const selectedInCategory = getCategorySelectedCount(category.id);
              const hasSelection = selectedInCategory > 0;
              
              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                  className="animate-fade-in"
                  style={{ animationDelay: `${(colIndex * categoriesPerColumn + index) * 30}ms` }}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left group",
                        "hover:border-primary/50 hover:shadow-lg hover:bg-accent/50",
                        hasSelection 
                          ? "bg-primary/10 border-primary/50" 
                          : "bg-card border-border/50",
                        isExpanded && "ring-2 ring-primary/30 bg-accent/30"
                      )}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {category.label}
                        </p>
                      </div>
                      {hasSelection && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                          {selectedInCategory}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-border/50 space-y-1">
                      {/* Select all button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInCategory(category.id);
                        }}
                        className="w-full text-left text-xs text-primary hover:underline font-medium py-1 px-2"
                      >
                        {getCategorySelectedCount(category.id) === category.subcategories.length 
                          ? "Tout désélectionner" 
                          : "Tout sélectionner"}
                      </button>
                      
                      {/* Subcategories */}
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
                              "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200",
                              isSelected 
                                ? "bg-primary/15 text-foreground" 
                                : "hover:bg-accent/50"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                              isSelected 
                                ? "bg-primary border-primary" 
                                : "border-border"
                            )}>
                              {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{sub.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ))}
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