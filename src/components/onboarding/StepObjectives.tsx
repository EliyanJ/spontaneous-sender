import { Badge } from "@/components/ui/badge";

const OBJECTIVES = [
  { value: "stage", label: "Stage", emoji: "🎓" },
  { value: "alternance", label: "Alternance", emoji: "🔄" },
  { value: "premier_emploi", label: "Premier emploi", emoji: "🚀" },
  { value: "cdi_cdd", label: "CDI / CDD", emoji: "📋" },
  { value: "freelance", label: "Freelance / Mission", emoji: "💼" },
];

interface StepObjectivesProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const StepObjectives = ({ selected, onChange }: StepObjectivesProps) => {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Que recherchez-vous ?
        </h2>
        <p className="text-muted-foreground">
          Sélectionnez un ou plusieurs objectifs
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {OBJECTIVES.map((obj) => {
          const isSelected = selected.includes(obj.value);
          return (
            <button
              key={obj.value}
              onClick={() => toggle(obj.value)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card hover:border-primary/40 text-foreground"
              }`}
            >
              <span className="text-lg">{obj.emoji}</span>
              {obj.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
