import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { loadCommunes, resolveLocation, normalizeVille } from "@/lib/cities";

interface CommuneSearchProps {
  value: string;
  onChange: (value: string, codePostal?: string) => void;
  placeholder?: string;
  className?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const CommuneSearch = ({
  value,
  onChange,
  placeholder = "Ville ou code postal...",
  className = "",
  onKeyPress,
}: CommuneSearchProps) => {
  const [suggestions, setSuggestions] = useState<Array<{ label: string; codePostal: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [communesData, setCommunesData] = useState<Record<string, string[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Charger les communes au montage
  useEffect(() => {
    const loadData = async () => {
      await loadCommunes();
      // Récupérer les données depuis le module cities
      const response = await fetch('/src/lib/communes.csv');
      const text = await response.text();
      const lines = text.split('\n').slice(1);
      
      const data: Record<string, string[]> = {};
      for (const line of lines) {
        const [nom, codePostal] = line.split(';');
        if (nom && codePostal) {
          const normalized = normalizeVille(nom.trim());
          if (!data[normalized]) {
            data[normalized] = [];
          }
          if (!data[normalized].includes(codePostal.trim())) {
            data[normalized].push(codePostal.trim());
          }
        }
      }
      setCommunesData(data);
    };
    loadData();
  }, []);

  // Gérer les clics en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Si c'est un code postal (commence par des chiffres)
    if (/^\d/.test(inputValue)) {
      const matching = Object.entries(communesData)
        .flatMap(([ville, codePostaux]) =>
          codePostaux
            .filter((cp) => cp.startsWith(inputValue))
            .map((cp) => ({
              label: `${cp} - ${ville.charAt(0).toUpperCase() + ville.slice(1)}`,
              codePostal: cp,
            }))
        )
        .slice(0, 10);
      
      setSuggestions(matching);
      setShowSuggestions(matching.length > 0);
    } else {
      // Recherche par nom de ville
      const normalized = normalizeVille(inputValue);
      const matching = Object.entries(communesData)
        .filter(([ville]) => ville.includes(normalized))
        .flatMap(([ville, codePostaux]) =>
          codePostaux.map((cp) => ({
            label: `${ville.charAt(0).toUpperCase() + ville.slice(1)} (${cp})`,
            codePostal: cp,
          }))
        )
        .slice(0, 10);

      setSuggestions(matching);
      setShowSuggestions(matching.length > 0);
    }
  };

  const handleSelectSuggestion = (suggestion: { label: string; codePostal: string }) => {
    onChange(suggestion.label, suggestion.codePostal);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
