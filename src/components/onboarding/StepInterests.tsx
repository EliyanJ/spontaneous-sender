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

interface StepInterestsProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const StepInterests = ({ selected, onChange }: StepInterestsProps) => {
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
      </div>
    </div>
  );
};
