import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectorSuggestion {
  code: string;
  label: string;
  description: string;
}

interface AIPhraseResult {
  phrase: string;
  sectors: SectorSuggestion[];
}

// Simulated AI responses based on keywords
const AI_RESPONSES: Record<string, AIPhraseResult[]> = {
  marketing: [
    {
      phrase: "J'aime la stratégie digitale dans une entreprise innovante.",
      sectors: [
        { code: "73.12Z", label: "Conseil en publicité", description: "Stratégie publicitaire et créative" },
        { code: "70.21Z", label: "Relations publiques", description: "Communication corporate et RP" },
        { code: "73.11Z", label: "Régie publicitaire", description: "Achat et vente d'espaces pub" }
      ]
    },
    {
      phrase: "Je veux travailler dans un environnement marketing orienté performance.",
      sectors: [
        { code: "73.12Z", label: "Conseil en publicité", description: "Stratégie marketing digital" },
        { code: "63.12Z", label: "Portails Internet", description: "Marketing web et analytics" },
        { code: "62.01Z", label: "Programmation", description: "Marketing tech et automation" }
      ]
    },
    {
      phrase: "Je recherche une agence créative où exprimer mes idées.",
      sectors: [
        { code: "73.11Z", label: "Régie publicitaire", description: "Création publicitaire" },
        { code: "73.12Z", label: "Conseil en publicité", description: "Direction artistique" },
        { code: "70.21Z", label: "Relations publiques", description: "Communication créative" }
      ]
    }
  ],
  tech: [
    {
      phrase: "Je veux créer des produits tech qui changent le quotidien.",
      sectors: [
        { code: "62.01Z", label: "Programmation informatique", description: "Développement de logiciels" },
        { code: "62.02A", label: "Conseil IT", description: "Conseil en systèmes" },
        { code: "63.11Z", label: "Data & Cloud", description: "Traitement de données" }
      ]
    },
    {
      phrase: "J'aime résoudre des problèmes complexes avec du code.",
      sectors: [
        { code: "62.01Z", label: "Programmation", description: "Développement logiciel" },
        { code: "62.09Z", label: "Autres activités IT", description: "Services informatiques" },
        { code: "62.03Z", label: "Gestion d'infra", description: "Infrastructure IT" }
      ]
    }
  ],
  finance: [
    {
      phrase: "Je veux accompagner les entreprises dans leur croissance financière.",
      sectors: [
        { code: "66.30Z", label: "Gestion de patrimoine", description: "Conseil financier" },
        { code: "64.19Z", label: "Banques", description: "Activités bancaires" },
        { code: "70.22Z", label: "Conseil en gestion", description: "Stratégie d'entreprise" }
      ]
    },
    {
      phrase: "L'analyse des marchés et les investissements me passionnent.",
      sectors: [
        { code: "64.30Z", label: "Fonds de placement", description: "Gestion d'actifs" },
        { code: "66.30Z", label: "Gestion de patrimoine", description: "Investissements" },
        { code: "64.20Z", label: "Holdings", description: "Gestion de participations" }
      ]
    }
  ],
  design: [
    {
      phrase: "Je veux concevoir des espaces qui inspirent les gens.",
      sectors: [
        { code: "71.11Z", label: "Architecture", description: "Conception de bâtiments" },
        { code: "71.12A", label: "Ingénierie bâtiment", description: "Études techniques" },
        { code: "74.10Z", label: "Design", description: "Design d'intérieur" }
      ]
    }
  ],
  default: [
    {
      phrase: "Je cherche une entreprise dynamique où je peux évoluer.",
      sectors: [
        { code: "70.22Z", label: "Conseil en gestion", description: "Management et organisation" },
        { code: "62.02A", label: "Conseil IT", description: "Transformation digitale" },
        { code: "82.99Z", label: "Conseil spécialisé", description: "Services aux entreprises" }
      ]
    }
  ]
};

interface AISearchModeProps {
  onSectorsValidated: (codes: string[]) => void;
}

export const AISearchMode = ({ onSectorsValidated }: AISearchModeProps) => {
  const [keyword, setKeyword] = useState("");
  const [phrases, setPhrases] = useState<AIPhraseResult[]>([]);
  const [selectedPhrase, setSelectedPhrase] = useState<AIPhraseResult | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [showPhrases, setShowPhrases] = useState(false);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    
    const key = keyword.toLowerCase().trim();
    const results = AI_RESPONSES[key] || AI_RESPONSES.default;
    setPhrases(results);
    setShowPhrases(true);
    setSelectedPhrase(null);
    setSelectedCodes([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePhraseSelect = (phrase: AIPhraseResult) => {
    setSelectedPhrase(phrase);
    setSelectedCodes(phrase.sectors.map(s => s.code));
    setShowPhrases(false);
  };

  const toggleSector = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleValidate = () => {
    if (selectedCodes.length > 0) {
      onSectorsValidated(selectedCodes);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Décrivez votre recherche et l'IA vous suggère des phrases</span>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Ex: marketing, tech, finance, design..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 h-14 text-lg bg-card border-border/50 focus:border-primary/50 rounded-xl"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            size="lg" 
            className="h-14 px-8 btn-premium rounded-xl"
          >
            Rechercher
          </Button>
        </div>
      </div>

      {/* AI Phrase Suggestions */}
      {showPhrases && phrases.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-muted-foreground">Cliquez sur une phrase qui vous correspond :</p>
          <div className="space-y-3">
            {phrases.map((phrase, index) => (
              <button
                key={index}
                onClick={() => handlePhraseSelect(phrase)}
                className="w-full text-left p-5 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base text-foreground font-medium leading-relaxed pr-4">
                    "{phrase.phrase}"
                  </p>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Phrase & Sectors */}
      {selectedPhrase && (
        <div className="space-y-6 animate-slide-in-right">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-primary font-medium">Phrase sélectionnée :</p>
            <p className="text-foreground mt-1">"{selectedPhrase.phrase}"</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Secteurs recommandés (cliquez pour sélectionner/désélectionner) :</p>
            <div className="grid gap-4 md:grid-cols-3">
              {selectedPhrase.sectors.map((sector, index) => {
                const isSelected = selectedCodes.includes(sector.code);
                return (
                  <button
                    key={sector.code}
                    onClick={() => toggleSector(sector.code)}
                    className={cn(
                      "relative p-5 rounded-xl border text-left transition-all duration-300",
                      isSelected 
                        ? "bg-primary/15 border-primary shadow-lg" 
                        : "bg-card border-border/50 hover:border-primary/30"
                    )}
                    style={isSelected ? { boxShadow: '0 0 25px hsl(var(--primary) / 0.2)' } : {}}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-2xl mb-3 block">
                      {index === 0 ? "🎯" : index === 1 ? "💼" : "🚀"}
                    </span>
                    <h4 className="font-semibold text-foreground mb-1">{sector.label}</h4>
                    <p className="text-sm text-muted-foreground">{sector.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validate Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleValidate}
              disabled={selectedCodes.length === 0}
              size="lg"
              className="px-10 h-14 text-base btn-premium rounded-xl"
            >
              Valider {selectedCodes.length} secteur{selectedCodes.length > 1 ? 's' : ''}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
