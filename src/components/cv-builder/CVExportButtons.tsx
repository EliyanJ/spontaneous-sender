// ══════════════════════════════════════════════════════════
// CVExportButtons.tsx — Téléchargement Word uniquement
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
  const [loading, setLoading] = useState(false);

  const baseName = userName
    ? `CV_${userName.replace(/\s+/g, "_")}`
    : "CV";

  const handleDocx = async () => {
    setLoading(true);
    try {
      const style = templateHtml ? extractStyleFromTemplate(templateHtml) : undefined;
      await exportCVToDocx({ cvData, fileName: `${baseName}.docx`, style });
      toast.success("Fichier Word téléchargé avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'export Word : " + (err?.message || "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        <button
          onClick={handleDocx}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? "Génération Word..." : "Télécharger en Word"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 text-center">Téléchargez votre CV au format Word</p>
      <button
        onClick={handleDocx}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-[hsl(var(--primary))]/20 text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
        <div className="text-left">
          <div>{loading ? "Génération en cours..." : "Télécharger en Word"}</div>
          <div className="text-xs font-normal opacity-70">Éditable dans Word / Google Docs</div>
        </div>
      </button>
    </div>
  );
};
