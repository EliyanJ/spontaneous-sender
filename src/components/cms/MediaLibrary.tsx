import React, { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Search, Trash2, Image as ImageIcon, Film, Loader2, Check } from "lucide-react";

interface MediaLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, type: "image" | "video") => void;
  mediaType?: "image" | "video" | "all";
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
const VIDEO_EXTS = ["mp4", "webm", "mov"];
const ALL_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];

const getFileType = (name: string): "image" | "video" => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return VIDEO_EXTS.includes(ext) ? "video" : "image";
};

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  open, onOpenChange, onSelect, mediaType = "all",
}) => {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["cms-media-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("cms-media").list("", {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    },
    enabled: open,
  });

  const getPublicUrl = (name: string) => {
    const { data } = supabase.storage.from("cms-media").getPublicUrl(name);
    return data.publicUrl;
  };

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const allowed = mediaType === "image" ? IMAGE_EXTS : mediaType === "video" ? VIDEO_EXTS : ALL_EXTS;
        if (!allowed.includes(ext)) {
          toast.error(`Format non supporté : .${ext}`);
          continue;
        }
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("cms-media").upload(fileName, file);
        if (error) {
          toast.error(`Erreur upload ${file.name}: ${error.message}`);
        } else {
          toast.success(`${file.name} importé`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["cms-media-files"] });
      setTab("library");
    } finally {
      setUploading(false);
    }
  }, [mediaType, queryClient]);

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.storage.from("cms-media").remove([name]);
    if (error) toast.error("Erreur suppression");
    else {
      toast.success("Fichier supprimé");
      queryClient.invalidateQueries({ queryKey: ["cms-media-files"] });
    }
  };

  const filtered = files?.filter((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    const typeMatch = mediaType === "all" || (mediaType === "image" ? IMAGE_EXTS.includes(ext) : VIDEO_EXTS.includes(ext));
    const searchMatch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return typeMatch && searchMatch;
  });

  const acceptFormats = mediaType === "image"
    ? IMAGE_EXTS.map((e) => `.${e}`).join(",")
    : mediaType === "video"
      ? VIDEO_EXTS.map((e) => `.${e}`).join(",")
      : ALL_EXTS.map((e) => `.${e}`).join(",");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Médiathèque</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit">
          {(["library", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "library" ? "Bibliothèque" : "Importer"}
            </button>
          ))}
        </div>

        {tab === "library" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 h-9 rounded-lg"
              />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !filtered?.length ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Aucun média</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 p-1">
                  {filtered.map((f) => {
                    const url = getPublicUrl(f.name);
                    const type = getFileType(f.name);
                    return (
                      <div
                        key={f.name}
                        className="group relative aspect-square rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all"
                        onClick={() => {
                          onSelect(url, type);
                          onOpenChange(false);
                        }}
                      >
                        {type === "image" ? (
                          <img src={url} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/40">
                            <Film className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                          onClick={(e) => handleDelete(f.name, e)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-2 py-1 truncate">
                          {f.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleUpload(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            )}
            <p className="text-sm font-medium text-foreground mb-1">
              {uploading ? "Import en cours..." : "Glissez vos fichiers ici"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Formats : {mediaType === "video" ? "MP4, WebM" : mediaType === "image" ? "PNG, JPG, WebP, GIF, SVG" : "PNG, JPG, WebP, GIF, SVG, MP4, WebM"}
            </p>
            {!uploading && (
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => fileInputRef.current?.click()}>
                Parcourir
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptFormats}
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
