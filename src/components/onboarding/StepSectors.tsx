import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { ACTIVITY_SECTORS } from "@/lib/activity-sectors";

const SECTOR_LABELS = ACTIVITY_SECTORS.map((s) => s.label);

interface StepSectorsProps {
  selectedSectors: string[];
  targetJobs: string;
  onSectorsChange: (sectors: string[]) => void;
  onTargetJobsChange: (jobs: string) => void;
}

export const StepSectors = ({
  selectedSectors,
  targetJobs,
  onSectorsChange,
  onTargetJobsChange,
}: StepSectorsProps) => {
  const [customSector, setCustomSector] = useState("");

  const toggle = (sector: string) => {
    onSectorsChange(
      selectedSectors.includes(sector)
        ? selectedSectors.filter((s) => s !== sector)
        : [...selectedSectors, sector]
    );
  };

  const addCustomSector = () => {
    const trimmed = customSector.trim();
    if (trimmed && !selectedSectors.includes(trimmed)) {
      onSectorsChange([...selectedSectors, trimmed]);
      setCustomSector("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSector();
    }
  };

  // Custom sectors are those not in the predefined list
  const customSelected = selectedSectors.filter((s) => !SECTOR_LABELS.includes(s));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Secteur & métiers
        </h2>
        <p className="text-muted-foreground">
          Dans quels domaines souhaitez-vous travailler ?
        </p>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium text-foreground">Secteurs d'activité</Label>
        <div className="flex flex-wrap gap-2">
          {SECTOR_LABELS.map((sector) => {
            const isSelected = selectedSectors.includes(sector);
            return (
              <button
                key={sector}
                onClick={() => toggle(sector)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40 text-foreground"
                }`}
              >
                {sector}
              </button>
            );
          })}
          {customSelected.map((sector) => (
            <button
              key={sector}
              onClick={() => toggle(sector)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-primary bg-primary/10 text-primary text-sm font-medium transition-all"
            >
              {sector}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={customSector}
            onChange={(e) => setCustomSector(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un secteur personnalisé..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addCustomSector}
            disabled={!customSector.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target-jobs" className="text-sm font-medium text-foreground">
          Métiers / postes visés
        </Label>
        <Textarea
          id="target-jobs"
          value={targetJobs}
          onChange={(e) => onTargetJobsChange(e.target.value)}
          placeholder="Ex : Développeur web, Chef de projet digital, Data analyst..."
          className="bg-background resize-none"
          rows={3}
        />
      </div>
    </div>
  );
};
