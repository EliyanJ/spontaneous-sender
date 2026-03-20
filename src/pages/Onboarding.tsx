import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { StepIdentity } from "@/components/onboarding/StepIdentity";
import { StepObjectives } from "@/components/onboarding/StepObjectives";
import { StepSectors } from "@/components/onboarding/StepSectors";
import { StepInterests } from "@/components/onboarding/StepInterests";
import { StepCV } from "@/components/onboarding/StepCV";
import { Logo } from "@/components/Logo";

const STEPS = ["Identité", "Objectifs", "Secteurs", "Intérêts", "CV"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — Identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  // Step 1 — Objectives
  const [objectives, setObjectives] = useState<string[]>([]);

  // Step 2 — Sectors
  const [sectors, setSectors] = useState<string[]>([]);
  const [targetJobs, setTargetJobs] = useState("");

  // Step 3 — Interests
  const [interests, setInterests] = useState<string[]>([]);

  // Step 4 — CV
  const [cvContent, setCvContent] = useState("");
  const [cvFileUrl, setCvFileUrl] = useState("");
  const [profileSummary, setProfileSummary] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  const canProceed = () => {
    if (step === 0) return firstName.trim().length > 0 && lastName.trim().length > 0 && specialty.trim().length > 0 && experienceLevel.length > 0;
    if (step === 1) return objectives.length > 0;
    if (step === 2) return sectors.length > 0;
    if (step === 3) return interests.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      // Use specialty as targetJobs fallback if not filled
      const finalTargetJobs = targetJobs.trim() || specialty.trim() || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          experience_level: experienceLevel || null,
          objective: objectives.join(","),
          target_sectors: sectors,
          target_jobs: finalTargetJobs,
          professional_interests: interests,
          cv_file_url: cvFileUrl || null,
          cv_content: cvContent || null,
          profile_summary: profileSummary.trim() || null,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header with logo */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Logo height={40} />
            <div className="text-center">
              <h1 className="text-lg font-display font-bold text-foreground">Bienvenue sur Cronos</h1>
              <p className="text-xs text-muted-foreground">Configurons votre profil en quelques étapes</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Étape {step + 1} sur {STEPS.length}
            </span>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                    i === step
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? "✓" : s}
                </span>
              ))}
            </div>
          </div>
          <Progress value={progress} className="h-2.5 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300" key={step}>
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-lg">
            {step === 0 && (
              <StepIdentity
                firstName={firstName}
                lastName={lastName}
                specialty={specialty}
                experienceLevel={experienceLevel}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onSpecialtyChange={setSpecialty}
                onExperienceLevelChange={setExperienceLevel}
              />
            )}
            {step === 1 && (
              <StepObjectives selected={objectives} onChange={setObjectives} />
            )}
            {step === 2 && (
              <StepSectors
                selectedSectors={sectors}
                targetJobs={targetJobs}
                onSectorsChange={setSectors}
                onTargetJobsChange={setTargetJobs}
              />
            )}
            {step === 3 && (
              <StepInterests selected={interests} onChange={setInterests} />
            )}
            {step === 4 && user && (
              <StepCV
                userId={user.id}
                cvContent={cvContent}
                cvFileUrl={cvFileUrl}
                profileSummary={profileSummary}
                onCvContentChange={setCvContent}
                onCvFileUrlChange={setCvFileUrl}
                onProfileSummaryChange={setProfileSummary}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm">
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
            className="min-w-[140px]"
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
