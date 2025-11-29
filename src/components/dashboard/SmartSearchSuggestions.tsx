import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface SmartSuggestion {
  phrase: string;
  sectors: string[];
  codes: string[];
}

const SMART_SUGGESTIONS: SmartSuggestion[] = [
  {
    phrase: "J'aime la stratégie dans une entreprise digitale innovante",
    sectors: ["Conseil en gestion", "Informatique", "Marketing"],
    codes: ["70.22Z", "62.01Z", "73.12Z"]
  },
  {
    phrase: "Je veux travailler dans la tech avec un impact concret",
    sectors: ["Programmation", "Data & Cloud", "Conseil IT"],
    codes: ["62.01Z", "63.11Z", "62.02A"]
  },
  {
    phrase: "Le commerce en ligne et l'e-commerce m'intéressent",
    sectors: ["E-commerce", "Vente à distance", "Commerce de détail"],
    codes: ["47.91A", "47.91B", "47.19A"]
  },
  {
    phrase: "Je suis passionné par le design et l'architecture",
    sectors: ["Architecture", "Ingénierie bâtiment", "Études techniques"],
    codes: ["71.11Z", "71.12A", "71.12B"]
  },
  {
    phrase: "La finance et la gestion de patrimoine m'attirent",
    sectors: ["Banques", "Gestion de patrimoine", "Assurances"],
    codes: ["64.19Z", "66.30Z", "65.12Z"]
  },
  {
    phrase: "Je veux contribuer à la santé et au bien-être",
    sectors: ["Activités hospitalières", "Pratique médicale", "Paramédical"],
    codes: ["86.10Z", "86.21Z", "86.90A"]
  }
];

interface SmartSearchSuggestionsProps {
  onSuggestionSelect: (codes: string[]) => void;
}

export const SmartSearchSuggestions = ({ onSuggestionSelect }: SmartSearchSuggestionsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Suggestions intelligentes</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SMART_SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionSelect(suggestion.codes)}
            className="group relative text-left p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <p className="relative text-sm font-medium text-foreground leading-relaxed mb-3">
              "{suggestion.phrase}"
            </p>
            
            <div className="relative flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {suggestion.sectors.map((sector, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {sector}
                  </span>
                ))}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
