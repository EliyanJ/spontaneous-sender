import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXPERIENCE_LEVELS = [
  { value: "debutant", label: "Débutant", sub: "0–2 ans", emoji: "🌱" },
  { value: "confirme", label: "Confirmé", sub: "3–5 ans", emoji: "⚡" },
  { value: "senior", label: "Senior", sub: "6–10 ans", emoji: "🎯" },
  { value: "expert", label: "Expert", sub: "10+ ans", emoji: "🏆" },
];

interface StepIdentityProps {
  firstName: string;
  lastName: string;
  specialty: string;
  experienceLevel: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onSpecialtyChange: (v: string) => void;
  onExperienceLevelChange: (v: string) => void;
}

export const StepIdentity = ({
  firstName,
  lastName,
  specialty,
  experienceLevel,
  onFirstNameChange,
  onLastNameChange,
  onSpecialtyChange,
  onExperienceLevelChange,
}: StepIdentityProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Commençons par faire connaissance
        </h2>
        <p className="text-muted-foreground text-sm">
          Ces informations permettent à l'IA de personnaliser vos candidatures.
        </p>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first-name" className="text-sm font-medium text-foreground">
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first-name"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Marie"
            className="bg-background"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last-name" className="text-sm font-medium text-foreground">
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="last-name"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Dupont"
            className="bg-background"
          />
        </div>
      </div>

      {/* Specialty */}
      <div className="space-y-1.5">
        <Label htmlFor="specialty" className="text-sm font-medium text-foreground">
          Spécialité / expertise principale <span className="text-destructive">*</span>
        </Label>
        <Input
          id="specialty"
          value={specialty}
          onChange={(e) => onSpecialtyChange(e.target.value)}
          placeholder="Ex : Marketing digital, Comptabilité, Développement web..."
          className="bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Utilisé dans l'objet de vos emails de candidature
        </p>
      </div>

      {/* Experience level */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Années d'expérience <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected = experienceLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onExperienceLevelChange(level.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card hover:border-primary/40 text-foreground"
                }`}
              >
                <span className="text-xl">{level.emoji}</span>
                <div>
                  <p className="text-sm font-medium leading-tight">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
