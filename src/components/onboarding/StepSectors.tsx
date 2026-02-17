import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const toggle = (sector: string) => {
    onSectorsChange(
      selectedSectors.includes(sector)
        ? selectedSectors.filter((s) => s !== sector)
        : [...selectedSectors, sector]
    );
  };

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
