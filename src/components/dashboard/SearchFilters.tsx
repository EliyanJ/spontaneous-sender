import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowLeft } from "lucide-react";

interface SearchFiltersProps {
  ville: string;
  setVille: (value: string) => void;
  minResults: string;
  setMinResults: (value: string) => void;
  minEmployees: string;
  setMinEmployees: (value: string) => void;
  loading: boolean;
  onSearch: () => void;
  onBack: () => void;
  selectedSectorsCount: number;
}

export const SearchFilters = ({
  ville,
  setVille,
  minResults,
  setMinResults,
  minEmployees,
  setMinEmployees,
  loading,
  onSearch,
  onBack,
  selectedSectorsCount
}: SearchFiltersProps) => {
  return (
    <div className="animate-slide-in-right">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifier les secteurs
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedSectorsCount} secteur{selectedSectorsCount > 1 ? 's' : ''} sélectionné{selectedSectorsCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-card border border-border/50">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Ville ou Code Postal</Label>
          <Input
            placeholder="Paris, 75001..."
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="bg-background border-border/50 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Résultats (1-100)</Label>
          <Input
            type="number"
            min="1"
            max="100"
            placeholder="20"
            value={minResults}
            onChange={(e) => setMinResults(e.target.value)}
            className="bg-background border-border/50 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Effectif</Label>
          <Select value={minEmployees} onValueChange={setMinEmployees}>
            <SelectTrigger className="bg-background border-border/50 focus:border-primary/50">
              <SelectValue placeholder="5-100 (recommandé)" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="5-100">5-100 (recommandé)</SelectItem>
              <SelectItem value="5-50">5-50 (PME)</SelectItem>
              <SelectItem value="10-100">10-100</SelectItem>
              <SelectItem value="20-100">20-100</SelectItem>
              <SelectItem value="50-200">50-200 (ETI)</SelectItem>
              <SelectItem value="0-500">Tous (0-500)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <Button 
            onClick={onSearch} 
            disabled={loading} 
            className="w-full btn-premium h-10"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
