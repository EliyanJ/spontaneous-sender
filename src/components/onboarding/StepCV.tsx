import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, X, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StepCVProps {
  userId: string;
  cvContent: string;
  cvFileUrl: string;
  profileSummary: string;
  onCvContentChange: (content: string) => void;
  onCvFileUrlChange: (url: string) => void;
  onProfileSummaryChange: (summary: string) => void;
}

export const StepCV = ({
  userId,
  cvContent,
  cvFileUrl,
  profileSummary,
  onCvContentChange,
  onCvFileUrlChange,
  onProfileSummaryChange,
}: StepCVProps) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Format non supporté", description: "PDF, DOCX ou TXT uniquement", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "10 Mo maximum", variant: "destructive" });
        return;
      }

      setUploading(true);
      setFileName(file.name);

      try {
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("user-cvs")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        onCvFileUrlChange(filePath);

        setParsing(true);
        setUploading(false);

        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data: parseResult, error: parseError } = await supabase.functions.invoke(
          "parse-cv-document",
          { body: { fileBase64: base64, fileName: file.name, fileType: file.type } }
        );

        if (parseError) {
          toast({ title: "Parsing en cours...", description: "La synthèse n'a pas pu être générée automatiquement. Vous pouvez la saisir manuellement." });
        } else if (parseResult?.text) {
          onCvContentChange(parseResult.text);
          toast({ title: "CV analysé !", description: "Vérifiez et modifiez la synthèse si nécessaire." });
        } else {
          toast({ title: "Parsing terminé", description: "Aucun contenu extrait. Vous pouvez saisir la synthèse manuellement." });
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({ title: "Erreur d'upload", description: error.message, variant: "destructive" });
        setFileName(null);
      } finally {
        setUploading(false);
        setParsing(false);
      }
    },
    [userId, onCvContentChange, onCvFileUrlChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setFileName(null);
    onCvFileUrlChange("");
    onCvContentChange("");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Votre CV
        </h2>
        <p className="text-muted-foreground">
          Uploadez votre CV pour générer une synthèse automatique
        </p>
      </div>

      {/* Upload zone */}
      {!fileName && !cvFileUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => document.getElementById("cv-input")?.click()}
        >
          <input
            id="cv-input"
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleInputChange}
          />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Glissez votre CV ici ou cliquez pour parcourir
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX ou TXT — 10 Mo max
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
          {uploading || parsing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground flex-1 truncate">
            {fileName || "CV uploadé"}
          </span>
          {uploading && <span className="text-xs text-muted-foreground">Upload...</span>}
          {parsing && <span className="text-xs text-muted-foreground">Analyse en cours...</span>}
          {!uploading && !parsing && (
            <button onClick={removeFile} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* CV extracted content */}
      {(cvContent || parsing) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Synthèse extraite de votre CV
          </Label>
          {parsing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Analyse par l'IA en cours...</span>
            </div>
          ) : (
            <Textarea
              value={cvContent}
              onChange={(e) => onCvContentChange(e.target.value)}
              className="bg-background resize-none min-h-[160px]"
              placeholder="La synthèse de votre CV apparaîtra ici..."
            />
          )}
        </div>
      )}

      {/* Profile summary — optional */}
      <div className="space-y-2">
        <Label htmlFor="profile-summary" className="text-sm font-medium text-foreground">
          Décrivez votre profil en quelques lignes{" "}
          <span className="text-muted-foreground font-normal">(optionnel)</span>
        </Label>
        <Textarea
          id="profile-summary"
          value={profileSummary}
          onChange={(e) => onProfileSummaryChange(e.target.value)}
          className="bg-background resize-none min-h-[100px]"
          placeholder="Ex : Diplômée d'un Master en Marketing digital, 3 ans d'expérience en stratégie de contenu et SEO. Je recherche un poste où je pourrai combiner créativité et data..."
        />
        <p className="text-xs text-muted-foreground">
          💡 Ce résumé aide l'IA à vous présenter avec vos propres mots dans les emails et lettres de motivation.
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Cette étape est optionnelle. Vous pourrez tout modifier depuis les Paramètres.
      </p>
    </div>
  );
};
