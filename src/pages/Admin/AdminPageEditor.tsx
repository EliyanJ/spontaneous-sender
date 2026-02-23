import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Save, Globe, Code, Type,
  Bold, Italic, Underline, List, ListOrdered, Link,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Anchor, Image, Film,
  Search, PanelRightClose, PanelRight, Eye, Blocks
} from "lucide-react";
import logoTransparent from "@/assets/logo-transparent.png";
import { MediaLibrary } from "@/components/cms/MediaLibrary";
import { ColorPickerPopover } from "@/components/cms/ColorPickerPopover";
import { BlockInserter } from "@/components/cms/BlockInserter";

export const AdminPageEditor = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const isNew = pageId === "new";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [status, setStatus] = useState("draft");
  const [pageType, setPageType] = useState<"blog" | "page">("blog");
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video" | "all">("all");
  const [blockInserterOpen, setBlockInserterOpen] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["cms-page", pageId],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("id", pageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setHtmlContent(page.content || "");
      setMetaTitle(page.meta_title || "");
      setMetaDescription(page.meta_description || "");
      setOgImage(page.og_image || "");
      setStatus(page.status);
      setPageType((page as any).page_type || "blog");
    }
  }, [page]);

  useEffect(() => {
    if (editorMode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [editorMode]);

  const generateSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isNew || slug === generateSlug(title)) {
      setSlug(generateSlug(val));
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    syncHtmlFromEditor();
  };

  const syncHtmlFromEditor = () => {
    if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
  };

  const insertLink = () => {
    const url = prompt("URL du lien :");
    if (url) execCmd("createLink", url);
  };

  const insertAnchor = () => {
    const name = prompt("Nom de l'ancre :");
    if (name && editorRef.current) {
      document.execCommand("insertHTML", false, `<a id="${name}" name="${name}"></a>`);
      syncHtmlFromEditor();
    }
  };

  const openMediaLibrary = (type: "image" | "video") => {
    setMediaType(type);
    setMediaOpen(true);
  };

  const handleMediaSelect = (url: string, type: "image" | "video") => {
    if (type === "image") {
      execCmd("insertImage", url);
    } else {
      document.execCommand("insertHTML", false, `<video src="${url}" controls style="max-width:100%;"></video>`);
      syncHtmlFromEditor();
    }
  };

  const handleColorSelect = (color: string) => {
    execCmd("foreColor", color);
  };

  const handleBlockInsert = (html: string, css: string) => {
    const block = css ? `<style>${css}</style>${html}` : html;
    document.execCommand("insertHTML", false, block);
    syncHtmlFromEditor();
  };

  const saveMutation = useMutation({
    mutationFn: async (saveStatus: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const payload: any = {
        title, slug, content: htmlContent,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        og_image: ogImage || null,
        status: saveStatus,
        page_type: pageType,
        author_id: user.id,
        ...(saveStatus === "published" ? { published_at: new Date().toISOString() } : {}),
      };

      if (isNew) {
        const { error } = await supabase.from("cms_pages").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cms_pages").update(payload).eq("id", pageId);
        if (error) throw error;
      }
    },
    onSuccess: (_, saveStatus) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success(saveStatus === "published" ? "Page publiée !" : "Brouillon enregistré");
      if (isNew) navigate("/admin/cms");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la sauvegarde"),
  });

  const toolbarGroups = [
    {
      label: "Texte",
      items: [
        { icon: Bold, cmd: "bold", label: "Gras" },
        { icon: Italic, cmd: "italic", label: "Italique" },
        { icon: Underline, cmd: "underline", label: "Souligné" },
      ]
    },
    {
      label: "Titres",
      items: [
        { icon: Heading1, cmd: "formatBlock", value: "h1", label: "Titre 1" },
        { icon: Heading2, cmd: "formatBlock", value: "h2", label: "Titre 2" },
        { icon: Heading3, cmd: "formatBlock", value: "h3", label: "Titre 3" },
      ]
    },
    {
      label: "Listes",
      items: [
        { icon: List, cmd: "insertUnorderedList", label: "Liste à puces" },
        { icon: ListOrdered, cmd: "insertOrderedList", label: "Liste numérotée" },
      ]
    },
    {
      label: "Alignement",
      items: [
        { icon: AlignLeft, cmd: "justifyLeft", label: "Gauche" },
        { icon: AlignCenter, cmd: "justifyCenter", label: "Centre" },
        { icon: AlignRight, cmd: "justifyRight", label: "Droite" },
      ]
    },
    {
      label: "Insérer",
      items: [
        { icon: Link, action: insertLink, label: "Lien" },
        { icon: Anchor, action: insertAnchor, label: "Ancre" },
        { icon: Image, action: () => openMediaLibrary("image"), label: "Image" },
        { icon: Film, action: () => openMediaLibrary("video"), label: "Vidéo" },
        { icon: Blocks, action: () => setBlockInserterOpen(true), label: "Bloc" },
      ]
    },
  ];

  const urlPrefix = pageType === "blog" ? "/blog/" : "/p/";

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col">
        {/* Top bar — glassmorphism */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/60 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cms")} className="gap-1.5 rounded-lg h-8">
              <ArrowLeft className="h-3.5 w-3.5" /> Retour
            </Button>
            <div className="h-4 w-px bg-border/50" />
            <Badge 
              variant="outline" 
              className={`text-[10px] rounded-md border-0 ${
                pageType === "blog" ? "bg-sky-500/10 text-sky-400" : "bg-violet-500/10 text-violet-400"
              }`}
            >
              {pageType === "blog" ? "Article" : "Page"}
            </Badge>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">{title || "Sans titre"}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Editor mode toggle — pill */}
            <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg mr-1">
              <button
                onClick={() => { if (editorMode === "html") setEditorMode("visual"); }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  editorMode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="h-3 w-3" /> Visuel
              </button>
              <button
                onClick={() => { syncHtmlFromEditor(); setEditorMode("html"); }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  editorMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="h-3 w-3" /> HTML
              </button>
            </div>

            {/* Preview button */}
            {status === "published" && slug && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => window.open(`${urlPrefix}${slug}`, "_blank")}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voir la page</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                >
                  {showRightPanel ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Propriétés</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/50" />
            <Button 
              variant="outline" size="sm" 
              onClick={() => saveMutation.mutate("draft")} 
              disabled={saveMutation.isPending} 
              className="h-8 text-xs rounded-lg"
            >
              <Save className="h-3 w-3 mr-1" /> Brouillon
            </Button>
            <Button 
              size="sm" 
              onClick={() => saveMutation.mutate("published")} 
              disabled={saveMutation.isPending} 
              className="h-8 text-xs rounded-lg shadow-lg shadow-primary/20"
            >
              <Globe className="h-3 w-3 mr-1" /> Publier
            </Button>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left toolbar — grouped with labels */}
          {editorMode === "visual" && (
            <div className="w-14 border-r border-border/40 bg-card/30 flex flex-col py-3 gap-1 overflow-y-auto shrink-0">
              {toolbarGroups.map((group, gi) => (
                <div key={gi} className="px-1.5">
                  {gi > 0 && <div className="h-px bg-border/30 my-2" />}
                  <p className="text-[8px] text-muted-foreground/50 uppercase tracking-widest text-center mb-1">{group.label}</p>
                  <div className="flex flex-col items-center gap-0.5">
                    {group.items.map((btn, bi) => (
                      <Tooltip key={bi}>
                        <TooltipTrigger asChild>
                          <button
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (btn.action) btn.action();
                              else if (btn.cmd) execCmd(btn.cmd, btn.value);
                            }}
                          >
                            <btn.icon className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{btn.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
              {/* Color picker */}
              <div className="px-1.5">
                <div className="h-px bg-border/30 my-2" />
                <p className="text-[8px] text-muted-foreground/50 uppercase tracking-widest text-center mb-1">Couleur</p>
                <div className="flex flex-col items-center">
                  <ColorPickerPopover onColorSelect={handleColorSelect} />
                </div>
              </div>
            </div>
          )}

          {/* Center: Live preview */}
          <div className="flex-1 overflow-y-auto bg-muted/20">
            <div className="max-w-4xl mx-auto shadow-xl shadow-black/5 my-6 mx-6 rounded-2xl border border-border/30 overflow-hidden bg-background">
              {/* Simulated header */}
              <div className="bg-card/80 backdrop-blur-sm border-b border-border/30 px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src={logoTransparent} alt="Cronos" className="h-7 w-auto" />
                  <span className="font-display text-sm font-bold text-foreground">Cronos</span>
                </div>
                <div className="flex gap-5 text-xs text-muted-foreground/60">
                  <span>Accueil</span>
                  <span>Aide</span>
                  <span>Tarifs</span>
                  <span>Connexion</span>
                </div>
              </div>

              {/* Content area */}
              <div className="px-8 py-10">
                <div className="max-w-2xl mx-auto">
                  <input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Titre de la page…"
                    className="w-full text-3xl md:text-4xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/25 mb-3 leading-tight"
                  />
                  {pageType === "blog" && (
                    <p className="text-sm text-muted-foreground/60 mb-8 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-primary inline-block" />
                      {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}

                  {editorMode === "visual" ? (
                    <div
                      ref={editorRef}
                      contentEditable
                      className="min-h-[400px] prose prose-lg max-w-none dark:prose-invert focus:outline-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary"
                      onInput={syncHtmlFromEditor}
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                      suppressContentEditableWarning
                    />
                  ) : (
                    <Textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm border-border/50 rounded-xl"
                      placeholder="<h1>Mon article</h1><p>Contenu...</p>"
                    />
                  )}
                </div>
              </div>

              {/* Simulated footer */}
              <div className="border-t border-border/30 bg-card/30 px-6 py-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground/50">
                  <div className="flex items-center gap-2">
                    <img src={logoTransparent} alt="Cronos" className="h-4 w-auto opacity-50" />
                    <span className="font-semibold">Cronos</span>
                  </div>
                  <span>© 2026 Cronos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: properties */}
          {showRightPanel && (
            <div className="w-72 border-l border-border/40 bg-card/40 backdrop-blur-sm overflow-y-auto shrink-0">
              <div className="p-4 space-y-5">
                {/* Page type */}
                <div>
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest">Type</Label>
                  <Select value={pageType} onValueChange={(v: "blog" | "page") => setPageType(v)}>
                    <SelectTrigger className="mt-1.5 h-9 text-sm rounded-lg border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">Article de blog</SelectItem>
                      <SelectItem value="page">Page personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Slug */}
                <div>
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest">URL</Label>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-xs text-muted-foreground/50 shrink-0">{urlPrefix}</span>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 text-sm rounded-lg border-border/50" placeholder="mon-article" />
                  </div>
                </div>

                {/* Publication toggle */}
                <div className="flex items-center justify-between py-1">
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest">Publié</Label>
                  <Switch
                    checked={status === "published"}
                    onCheckedChange={(checked) => setStatus(checked ? "published" : "draft")}
                  />
                </div>

                <div className="h-px bg-border/30" />

                {/* SEO */}
                <div>
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                    <Search className="h-3 w-3" /> SEO
                  </Label>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Meta Title</Label>
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} className="mt-1 h-9 text-sm rounded-lg border-border/50" />
                  <div className="flex justify-between mt-1">
                    <div />
                    <p className={`text-[10px] ${(metaTitle || title).length > 60 ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                      {(metaTitle || title).length}/60
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Meta Description</Label>
                  <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Description pour les moteurs de recherche" rows={2} className="mt-1 text-sm rounded-lg border-border/50" />
                  <div className="flex justify-between mt-1">
                    <div />
                    <p className={`text-[10px] ${metaDescription.length > 160 ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                      {metaDescription.length}/160
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Image OG</Label>
                  <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." className="mt-1 h-9 text-sm rounded-lg border-border/50" />
                </div>

                <div className="h-px bg-border/30" />

                {/* Google preview — card style */}
                <div>
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest">Aperçu Google</Label>
                  <div className="mt-2 p-3.5 bg-background rounded-xl border border-border/40 shadow-sm">
                    <p className="text-sm text-blue-500 font-medium truncate leading-tight">
                      {metaTitle || title || "Titre de la page"}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                      getcronos.fr{urlPrefix}{slug || "url"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {metaDescription || "Aucune description définie"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialogs */}
        <MediaLibrary
          open={mediaOpen}
          onOpenChange={setMediaOpen}
          onSelect={handleMediaSelect}
          mediaType={mediaType}
        />
        <BlockInserter
          open={blockInserterOpen}
          onOpenChange={setBlockInserterOpen}
          onInsert={handleBlockInsert}
        />
      </div>
    </TooltipProvider>
  );
};
