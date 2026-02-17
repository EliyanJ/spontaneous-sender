import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { StepObjectives } from "@/components/onboarding/StepObjectives";
import { StepSectors } from "@/components/onboarding/StepSectors";
import { StepInterests } from "@/components/onboarding/StepInterests";
import { StepCV } from "@/components/onboarding/StepCV";

const STEPS = ["Objectifs", "Secteurs", "Intérêts", "CV"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [objectives, setObjectives] = useState<string[]>([]);
  // Step 2
  const [sectors, setSectors] = useState<string[]>([]);
  const [targetJobs, setTargetJobs] = useState("");
  // Step 3
  const [interests, setInterests] = useState<string[]>([]);
  // Step 4
  const [cvContent, setCvContent] = useState("");
  const [cvFileUrl, setCvFileUrl] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  const canProceed = () => {
    if (step === 0) return objectives.length > 0;
    if (step === 1) return sectors.length > 0;
    if (step === 2) return interests.length > 0;
    return true; // CV is optional
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          objective: objectives.join(","),
          target_sectors: sectors,
          target_jobs: targetJobs || null,
          professional_interests: interests,
          cv_file_url: cvFileUrl || null,
          cv_content: cvContent || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Profil complété ! 🎉", description: "Bienvenue sur votre tableau de bord." });
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Onboarding save error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Étape {step + 1} sur {STEPS.length}
            </span>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`text-xs px-2 py-1 rounded-full ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {step === 0 && (
            <StepObjectives selected={objectives} onChange={setObjectives} />
          )}
          {step === 1 && (
            <StepSectors
              selectedSectors={sectors}
              targetJobs={targetJobs}
              onSectorsChange={setSectors}
              onTargetJobsChange={setTargetJobs}
            />
          )}
          {step === 2 && (
            <StepInterests selected={interests} onChange={setInterests} />
          )}
          {step === 3 && user && (
            <StepCV
              userId={user.id}
              cvContent={cvContent}
              cvFileUrl={cvFileUrl}
              onCvContentChange={setCvContent}
              onCvFileUrlChange={setCvFileUrl}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Terminer
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
