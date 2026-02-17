import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

const INTERESTS = [
  { value: "teamwork", label: "Travail en équipe", emoji: "🤝" },
  { value: "autonomy", label: "Autonomie", emoji: "🧭" },
  { value: "creativity", label: "Créativité", emoji: "🎨" },
  { value: "technical", label: "Technique", emoji: "⚙️" },
  { value: "international", label: "International", emoji: "🌍" },
  { value: "management", label: "Management", emoji: "📊" },
  { value: "communication", label: "Communication", emoji: "💬" },
  { value: "innovation", label: "Innovation", emoji: "💡" },
  { value: "social_impact", label: "Impact social", emoji: "🌱" },
  { value: "data", label: "Data & Analytics", emoji: "📈" },
  { value: "design", label: "Design", emoji: "✏️" },
  { value: "commercial", label: "Commercial", emoji: "🤑" },
];

const PREDEFINED_VALUES = INTERESTS.map((i) => i.value);

interface StepInterestsProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const StepInterests = ({ selected, onChange }: StepInterestsProps) => {
  const [customInterest, setCustomInterest] = useState("");

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const addCustom = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomInterest("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  const customSelected = selected.filter((s) => !PREDEFINED_VALUES.includes(s));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Ce qui vous plaît
        </h2>
        <p className="text-muted-foreground">
          Quels sont vos centres d'intérêt professionnels ?
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest.value);
          return (
            <button
              key={interest.value}
              onClick={() => toggle(interest.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card hover:border-primary/40 text-foreground"
              }`}
            >
              <span>{interest.emoji}</span>
              {interest.label}
            </button>
          );
        })}
        {customSelected.map((interest) => (
          <button
            key={interest}
            onClick={() => toggle(interest)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary bg-primary/10 text-primary shadow-sm text-sm font-medium transition-all"
          >
            <span>✨</span>
            {interest}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>

      <div className="flex gap-2 max-w-md mx-auto">
        <Input
          value={customInterest}
          onChange={(e) => setCustomInterest(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter un intérêt personnalisé..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addCustom}
          disabled={!customInterest.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
