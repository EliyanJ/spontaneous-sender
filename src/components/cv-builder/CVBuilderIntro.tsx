import React from "react";
import { FileText, Target, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CVBuilderIntroProps {
  onSelectMode: (mode: "create" | "adapt") => void;
}

export const CVBuilderIntro = ({ onSelectMode }: CVBuilderIntroProps) => {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          CV Builder
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Créez un CV professionnel adapté à votre secteur ou optimisez-le pour une offre d'emploi spécifique.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create CV */}
        <button
          onClick={() => onSelectMode("create")}
          className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl hover:bg-card/80 hover:border-primary/30 transition-all duration-300 text-left"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <Plus className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Créer un CV</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Partez de zéro ou importez un CV existant. L'IA structure et optimise vos données pour le secteur choisi.
            </p>
            <div className="flex items-center gap-2 mt-4 text-primary text-sm font-medium">
              <Upload className="h-4 w-4" />
              Import CV ou saisie manuelle
            </div>
          </div>
        </button>

        {/* Adapt to job offer */}
        <button
          onClick={() => onSelectMode("adapt")}
          className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl hover:bg-card/80 hover:border-primary/30 transition-all duration-300 text-left"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Adapter à une offre</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Importez votre CV + une fiche de poste. L'IA intègre les mots-clés manquants et optimise le contenu ATS.
            </p>
            <div className="flex items-center gap-2 mt-4 text-primary text-sm font-medium">
              <FileText className="h-4 w-4" />
              CV + fiche de poste → CV optimisé
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
