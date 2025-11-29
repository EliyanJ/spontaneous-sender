import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowLeft, MapPin, Users, Hash } from "lucide-react";

interface SearchFiltersStepProps {
  selectedCodesCount: number;
  ville: string;
  setVille: (value: string) => void;
  minResults: string;
  setMinResults: (value: string) => void;
  minEmployees: string;
  setMinEmployees: (value: string) => void;
  loading: boolean;
  onSearch: () => void;
  onBack: () => void;
}

export const SearchFiltersStep = ({
  selectedCodesCount,
  ville,
  setVille,
  minResults,
  setMinResults,
  minEmployees,
  setMinEmployees,
  loading,
  onSearch,
  onBack
}: SearchFiltersStepProps) => {
  return (
    <div className="max-w-4xl mx-auto animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifier les secteurs
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-sm text-primary font-medium">
            {selectedCodesCount} secteur{selectedCodesCount > 1 ? 's' : ''} sélectionné{selectedCodesCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-8 rounded-2xl bg-card border border-border/50 space-y-6">
        <h3 className="text-lg font-semibold text-foreground">Affinez votre recherche</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ville ou Code Postal
            </Label>
            <Input
              placeholder="Paris, 75001..."
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="h-12 bg-background border-border/50 focus:border-primary/50 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Nombre de résultats
            </Label>
            <Input
              type="number"
              min="1"
              max="100"
              placeholder="20"
              value={minResults}
              onChange={(e) => setMinResults(e.target.value)}
              className="h-12 bg-background border-border/50 focus:border-primary/50 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Effectif
            </Label>
            <Select value={minEmployees} onValueChange={setMinEmployees}>
              <SelectTrigger className="h-12 bg-background border-border/50 focus:border-primary/50 rounded-xl">
                <SelectValue placeholder="5-100 (recommandé)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="5-100">5-100 (recommandé)</SelectItem>
                <SelectItem value="5-50">5-50 (PME)</SelectItem>
                <SelectItem value="10-100">10-100</SelectItem>
                <SelectItem value="20-100">20-100</SelectItem>
                <SelectItem value="50-200">50-200 (ETI)</SelectItem>
                <SelectItem value="0-500">Tous (0-500)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button 
            onClick={onSearch} 
            disabled={loading} 
            size="lg"
            className="px-12 h-14 text-base btn-premium rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Lancer la recherche
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
