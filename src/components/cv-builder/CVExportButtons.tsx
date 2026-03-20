// ══════════════════════════════════════════════════════════
// CVExportButtons.tsx — Téléchargement Word + PDF
// ══════════════════════════════════════════════════════════

import React, { useState } from "react";
import { FileText, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCVData } from "@/lib/cv-templates/injectCVData";
import { exportCVToDocx } from "@/lib/cv-export/exportDocx";
import { extractStyleFromTemplate } from "@/lib/cv-export/extractStyleFromTemplate";
import { exportCVToPdf } from "@/lib/cv-export/exportPdfFromHtml";

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
  const [loadingPdf, setLoadingPdf] = useState(false);

  const baseName = userName
    ? `CV_${userName.replace(/\s+/g, "_")}`
    : "CV";

  const handleDocx = async () => {
    setLoadingDocx(true);
    try {
      const style = templateHtml ? extractStyleFromTemplate(templateHtml) : undefined;
      await exportCVToDocx({ cvData, fileName: `${baseName}.docx`, style });
      toast.success("Fichier Word téléchargé avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'export Word : " + (err?.message || "Erreur inconnue"));
    } finally {
      setLoadingDocx(false);
    }
  };

  const handlePdf = async () => {
    if (!templateHtml) {
      toast.error("Aucun template disponible pour l'export PDF");
      return;
    }
    setLoadingPdf(true);
    try {
      await exportCVToPdf(templateHtml, cvData, `${baseName}.pdf`);
      toast.success("PDF téléchargé avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'export PDF : " + (err?.message || "Erreur inconnue"));
    } finally {
      setLoadingPdf(false);
    }
  };

  if (compact) {
    return (
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={handlePdf}
          disabled={loadingPdf || !templateHtml}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg text-sm disabled:opacity-50"
        >
          {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {loadingPdf ? "Génération PDF..." : "Télécharger en PDF"}
        </button>
        <button
          onClick={handleDocx}
          disabled={loadingDocx}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg text-sm disabled:opacity-50"
        >
          {loadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loadingDocx ? "Génération Word..." : "Télécharger en Word"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 text-center">Téléchargez votre CV au format de votre choix</p>

      {/* PDF */}
      <button
        onClick={handlePdf}
        disabled={loadingPdf || !templateHtml}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 text-sm disabled:opacity-50"
      >
        {loadingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
        <div className="text-left">
          <div>{loadingPdf ? "Génération en cours..." : "Télécharger en PDF"}</div>
          <div className="text-xs font-normal opacity-70">Mise en page fidèle au template</div>
        </div>
      </button>

      {/* Word */}
      <button
        onClick={handleDocx}
        disabled={loadingDocx}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-[hsl(var(--primary))]/20 text-sm disabled:opacity-50"
      >
        {loadingDocx ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
        <div className="text-left">
          <div>{loadingDocx ? "Génération en cours..." : "Télécharger en Word"}</div>
          <div className="text-xs font-normal opacity-70">Éditable dans Word / Google Docs</div>
        </div>
      </button>
    </div>
  );
};
