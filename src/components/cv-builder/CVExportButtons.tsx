// ══════════════════════════════════════════════════════════
// CVExportButtons.tsx
// Bouton "Télécharger en Word"
// ══════════════════════════════════════════════════════════

import React, { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCVData } from "@/lib/cv-templates/injectCVData";
import { exportCVToDocx } from "@/lib/cv-export/exportDocx";
import { extractStyleFromTemplate } from "@/lib/cv-export/extractStyleFromTemplate";

interface CVExportButtonsProps {
  previewRef?: React.RefObject<HTMLDivElement>;
  templateHtml?: string;
  cvData: TemplateCVData;
  userName?: string;
  compact?: boolean;
}

export const CVExportButtons: React.FC<CVExportButtonsProps> = ({
  templateHtml = "",
  cvData,
  userName,
  compact = false,
}) => {
  const [loadingDocx, setLoadingDocx] = useState(false);

  const baseName = userName
    ? `CV_${userName.replace(/\s+/g, "_")}`
    : "CV";

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      // Mode 1 : capture du DOM React déjà rendu (templates canvas-v2 + legacy)
      if (previewRef?.current) {
        await exportCVToPdfFromElement({
          element: previewRef.current,
          fileName: `${baseName}.pdf`,
          onProgress: (step) => {
            if (step === "rendering") toast.loading("Rendu du CV en cours...", { id: "pdf-export" });
            if (step === "generating") toast.loading("Génération PDF...", { id: "pdf-export" });
            if (step === "done") toast.dismiss("pdf-export");
          },
        });
        toast.success("PDF téléchargé avec succès !");
        return;
      }

      // Mode 2 : fallback html-v1 (reconstruction HTML)
      if (templateHtml) {
        await exportCVToPdf({
          templateHtml,
          cvData,
          fileName: `${baseName}.pdf`,
          onProgress: (step) => {
            if (step === "rendering") toast.loading("Génération du PDF en cours...", { id: "pdf-export" });
            if (step === "done") toast.dismiss("pdf-export");
          },
        });
        toast.success("PDF téléchargé avec succès !");
        return;
      }

      toast.error("Aucun aperçu disponible pour l'export PDF. Vérifiez que le template est bien chargé.");
    } catch (err: any) {
      toast.dismiss("pdf-export");
      toast.error("Erreur lors de l'export PDF : " + (err?.message || "Erreur inconnue"));
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDocx = async () => {
    setLoadingDocx(true);
    try {
      const style = templateHtml ? extractStyleFromTemplate(templateHtml) : undefined;
      await exportCVToDocx({
        cvData,
        fileName: `${baseName}.docx`,
        style,
      });
      toast.success("Fichier Word téléchargé avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'export Word : " + (err?.message || "Erreur inconnue"));
    } finally {
      setLoadingDocx(false);
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        <button
          onClick={handleDocx}
          disabled={loadingDocx}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg text-sm disabled:opacity-50"
        >
          {loadingDocx
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <FileText className="h-4 w-4" />}
          {loadingDocx ? "Génération Word..." : "Télécharger en Word"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 text-center">Téléchargez votre CV au format Word</p>
      <button
        onClick={handleDocx}
        disabled={loadingDocx}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-[hsl(var(--primary))]/20 text-sm disabled:opacity-50"
      >
        {loadingDocx
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : <FileText className="h-5 w-5" />}
        <div className="text-left">
          <div>{loadingDocx ? "Génération en cours..." : "Télécharger en Word"}</div>
          <div className="text-xs font-normal opacity-70">Éditable dans Word / Google Docs</div>
        </div>
      </button>
    </div>
  );
};
