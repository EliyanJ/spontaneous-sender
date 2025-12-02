import React, { useState } from "react";
import { Check, X, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Définition des régions avec leurs codes postaux
const REGIONS: Record<string, string[]> = {
  "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "Provence-Alpes-Côte d'Azur": ["04", "05", "06", "13", "83", "84"],
  "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  "Occitanie": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "Hauts-de-France": ["02", "59", "60", "62", "80"],
  "Grand Est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  "Pays de la Loire": ["44", "49", "53", "72", "85"],
  "Bretagne": ["22", "29", "35", "56"],
  "Normandie": ["14", "27", "50", "61", "76"],
  "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "Centre-Val de Loire": ["18", "28", "36", "37", "41", "45"],
};

interface RegionSearchProps {
  value: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
}

export const RegionSearch: React.FC<RegionSearchProps> = ({
  value = [],
  onChange,
  placeholder = "Ajouter des villes ou régions..."
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleAddRegion = (regionName: string) => {
    if (!value.includes(regionName)) {
      onChange([...value, regionName]);
    }
  };

  const handleAddCity = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemove = (location: string) => {
    onChange(value.filter(v => v !== location));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCity();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 pl-10 bg-background border-border/50 focus:border-primary/50 rounded-xl"
          />
        </div>
        <Button
          type="button"
          onClick={handleAddCity}
          disabled={!inputValue.trim()}
          variant="outline"
          className="h-12 px-4 rounded-xl"
        >
          Ajouter
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 px-4 rounded-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              Régions
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher une région..." />
              <CommandList>
                <CommandEmpty>Aucune région trouvée</CommandEmpty>
                <CommandGroup>
                  {Object.keys(REGIONS).map((region) => (
                    <CommandItem
                      key={region}
                      onSelect={() => {
                        handleAddRegion(region);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          value.includes(region) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {region}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags des localisations sélectionnées */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((location) => (
            <Badge
              key={location}
              variant="secondary"
              className="px-3 py-1.5 text-sm bg-primary/10 text-primary border-primary/20 rounded-lg"
            >
              {location}
              <button
                type="button"
                onClick={() => handleRemove(location)}
                className="ml-2 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
