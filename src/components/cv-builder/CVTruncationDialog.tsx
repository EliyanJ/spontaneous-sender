import React, { useState, useMemo } from "react";
import { Scissors, CheckCircle2, PenLine, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CVFieldViolation } from "@/lib/cv-export/cvDataValidator";

// ── Types ──────────────────────────────────────────────────────
interface ViolationItemState {
  mode: "accepted" | "manual"; // accepted = suggestion IA, manual = réécriture
  manualValue: string;
  expanded: boolean;
}

interface CVTruncationDialogProps {
  open: boolean;
  violations: CVFieldViolation[];
  /** Appelé quand l'utilisateur valide tous les choix */
  onConfirm: (resolvedValues: Array<{ id: string; finalValue: string }>) => void;
  /** Appelé si l'utilisateur annule (conserve les données originales) */
  onSkip: () => void;
}

// ── Composant principal ────────────────────────────────────────
export function CVTruncationDialog({
  open,
  violations,
  onConfirm,
  onSkip,
}: CVTruncationDialogProps) {
  // État par violation : mode + valeur manuelle
  const [states, setStates] = useState<Record<string, ViolationItemState>>(() =>
    Object.fromEntries(
      violations.map((v) => [
        v.id,
        { mode: "accepted", manualValue: v.suggested, expanded: false },
      ])
    )
  );

  // Réinitialiser l'état quand les violations changent (nouvel import)
  React.useEffect(() => {
    setStates(
      Object.fromEntries(
        violations.map((v) => [
          v.id,
          { mode: "accepted", manualValue: v.suggested, expanded: false },
        ])
      )
    );
  }, [violations]);

  const allAccepted = useMemo(
    () => Object.values(states).every((s) => s.mode === "accepted"),
    [states]
  );

  const handleAcceptAll = () => {
    setStates((prev) => {
      const next = { ...prev };
      for (const id in next) {
        next[id] = { ...next[id], mode: "accepted", manualValue: violations.find(v => v.id === id)?.suggested || "" };
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const resolved = violations.map((v) => {
      const s = states[v.id];
      const finalValue =
        s?.mode === "manual" ? (s.manualValue || v.suggested) : v.suggested;
      return { id: v.id, finalValue };
    });
    onConfirm(resolved);
  };

  const setMode = (id: string, mode: "accepted" | "manual") => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], mode, expanded: mode === "manual" },
    }));
  };

  const setManualValue = (id: string, value: string) => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], manualValue: value },
    }));
  };

  const toggleExpanded = (id: string) => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded },
    }));
  };

  // Compter les caractères excédentaires
  const totalExcess = violations.reduce(
    (sum, v) => sum + (v.originalLength - v.limit),
    0
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Scissors className="h-4 w-4 text-foreground" />
            </div>
            Contenu trop long — validation requise
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {violations.length === 1
              ? "1 passage dépasse"
              : `${violations.length} passages dépassent`}{" "}
            les limites du format A4. L'IA propose des raccourcis — vous pouvez les accepter ou réécrire manuellement.
          </DialogDescription>
        </DialogHeader>

        {/* Stats rapides */}
        <div className="flex items-center gap-3 px-1">
          <Badge variant="outline" className="border-border text-muted-foreground gap-1.5 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {violations.length} {violations.length === 1 ? "violation" : "violations"} — {totalExcess} car. excédentaires au total
          </Badge>
          {!allAccepted && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={handleAcceptAll}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Tout accepter
            </Button>
          )}
        </div>

        {/* Liste des violations */}
        <ScrollArea className="max-h-[50vh] pr-2">
          <div className="space-y-3 py-1">
            {violations.map((v) => {
              const s = states[v.id];
              if (!s) return null;

              const currentValue = s.mode === "manual" ? s.manualValue : v.suggested;
              const isManualTooLong = s.mode === "manual" && s.manualValue.length > v.limit;

              return (
                <div
                  key={v.id}
                  className={`rounded-xl border transition-colors ${
                    s.mode === "accepted"
                      ? "border-green-500/25 bg-green-500/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  {/* En-tête de la violation */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {v.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-600"
                        >
                          {v.originalLength} → {v.limit} car.
                        </Badge>
                        {s.mode === "accepted" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 border-green-500/40 text-green-600 bg-green-500/5"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            IA acceptée
                          </Badge>
                        )}
                        {s.mode === "manual" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 border-primary/40 text-primary bg-primary/5"
                          >
                            <PenLine className="h-2.5 w-2.5 mr-1" />
                            Manuel
                          </Badge>
                        )}
                      </div>

                      {/* Texte de prévisualisation (version courte) */}
                      {!s.expanded && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {currentValue}
                        </p>
                      )}
                    </div>

                    {/* Bouton déplier */}
                    <button
                      onClick={() => toggleExpanded(v.id)}
                      className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {s.expanded
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>

                  {/* Corps déplié */}
                  {s.expanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">

                        {/* Texte original */}
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Texte original ({v.originalLength} car.)
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                          {v.original}
                        </p>
                      </div>

                      {/* Suggestion IA */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Suggestion IA ({v.suggested.length} car.)
                          </div>
                          <button
                            onClick={() => setMode(v.id, "accepted")}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                              s.mode === "accepted"
                                ? "bg-secondary text-secondary-foreground border border-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            {s.mode === "accepted" ? "✓ Sélectionné" : "Utiliser cette version"}
                          </button>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed bg-background rounded-lg px-3 py-2 border border-border">
                          {v.suggested}
                        </p>
                      </div>

                      {/* Zone de réécriture manuelle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Ou réécrire manuellement
                          </div>
                          <button
                            onClick={() => setMode(v.id, "manual")}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                              s.mode === "manual"
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            {s.mode === "manual" ? "✓ Mode manuel actif" : "Écrire moi-même"}
                          </button>
                        </div>
                        <div className="relative">
                          <Textarea
                            value={s.mode === "manual" ? s.manualValue : v.suggested}
                            onChange={(e) => {
                              setMode(v.id, "manual");
                              setManualValue(v.id, e.target.value);
                            }}
                            onFocus={() => setMode(v.id, "manual")}
                            placeholder={`Max ${v.limit} caractères...`}
                            className={`text-xs resize-none pr-14 ${
                              isManualTooLong
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                            rows={3}
                          />
                          {/* Compteur de caractères */}
                          <div
                            className={`absolute bottom-2 right-2.5 text-[10px] font-mono ${
                              s.mode === "manual" && s.manualValue.length > v.limit
                                ? "text-destructive font-bold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {s.mode === "manual" ? s.manualValue.length : v.suggested.length}/{v.limit}
                          </div>
                        </div>
                        {isManualTooLong && (
                          <p className="text-[10px] text-destructive mt-1">
                            ⚠ Encore {s.manualValue.length - v.limit} caractères à supprimer
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onSkip}
          >
            Ignorer et continuer quand même
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2"
            disabled={Object.entries(states).some(([id, s]) => {
              if (s.mode !== "manual") return false;
              const v = violations.find((v) => v.id === id);
              return v ? s.manualValue.length > v.limit : false;
            })}
          >
            <CheckCircle2 className="h-4 w-4" />
            Appliquer les corrections ({violations.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
