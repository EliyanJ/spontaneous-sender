// ══════════════════════════════════════════════════════════
// CVExportButtons.tsx
// Boutons "Télécharger en PDF" + "Télécharger en Word"
// Props: templateHtml, cvData (TemplateCVData), userName?
// ══════════════════════════════════════════════════════════

import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCVData } from "@/lib/cv-templates/injectCVData";
import { exportCVToPdf } from "@/lib/cv-export/exportPdf";
import { exportCVToDocx } from "@/lib/cv-export/exportDocx";
import { extractStyleFromTemplate } from "@/lib/cv-export/extractStyleFromTemplate";

interface CVExportButtonsProps {
  templateHtml: string;
  cvData: TemplateCVData;
  userName?: string;
  /** Affichage en mode "plein" (default) ou "compact" pour le footer */
  compact?: boolean;
}

export const CVExportButtons: React.FC<CVExportButtonsProps> = ({
  templateHtml,
  cvData,
  userName,
  compact = false,
}) => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingDocx, setLoadingDocx] = useState(false);

  const baseName = userName
    ? `CV_${userName.replace(/\s+/g, "_")}`
    : "CV";

  const handlePdf = async () => {
    if (!templateHtml) {
      toast.error("Aucun template sélectionné pour l'export PDF");
      return;
    }
    setLoadingPdf(true);
    try {
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
    } catch (err: any) {
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
      <div className="w-full flex gap-3">
        <button
          onClick={handlePdf}
          disabled={loadingPdf || loadingDocx}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg text-sm disabled:opacity-50"
        >
          {loadingPdf
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />}
          {loadingPdf ? "Génération PDF..." : "Télécharger en PDF"}
        </button>
        <button
          onClick={handleDocx}
          disabled={loadingPdf || loadingDocx}
          className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-bold rounded-xl transition-all hover:bg-blue-50 text-sm disabled:opacity-50"
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
      <p className="text-sm text-slate-500 text-center">Choisissez votre format de téléchargement</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePdf}
          disabled={loadingPdf || loadingDocx}
          className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-[hsl(var(--primary))]/20 text-sm disabled:opacity-50"
        >
          {loadingPdf
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <Download className="h-5 w-5" />}
          <div className="text-left">
            <div>{loadingPdf ? "Génération en cours..." : "Télécharger en PDF"}</div>
            <div className="text-xs font-normal opacity-80">Pixel-perfect · Non modifiable</div>
          </div>
        </button>
        <button
          onClick={handleDocx}
          disabled={loadingPdf || loadingDocx}
          className="flex-1 flex items-center justify-center gap-3 py-4 px-6 border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-bold rounded-2xl transition-all hover:bg-blue-50 text-sm disabled:opacity-50"
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
    </div>
  );
};
