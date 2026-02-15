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
import {
  ArrowLeft, Save, Globe, Code, Type,
  Bold, Italic, Underline, List, ListOrdered, Link, Palette,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Anchor, Image,
  Settings, Search, PanelLeftClose, PanelRightClose
} from "lucide-react";
import cronosLogo from "@/assets/cronos-logo.png";

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

  const insertImage = () => {
    const url = prompt("URL de l'image :");
    if (url) execCmd("insertImage", url);
  };

  const changeColor = () => {
    const color = prompt("Couleur (hex, ex: #ff0000) :");
    if (color) execCmd("foreColor", color);
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

  const toolbarButtons = [
    { icon: Bold, cmd: "bold", label: "Gras" },
    { icon: Italic, cmd: "italic", label: "Italique" },
    { icon: Underline, cmd: "underline", label: "Souligné" },
    { divider: true },
    { icon: Heading1, cmd: "formatBlock", value: "h1", label: "Titre 1" },
    { icon: Heading2, cmd: "formatBlock", value: "h2", label: "Titre 2" },
    { icon: Heading3, cmd: "formatBlock", value: "h3", label: "Titre 3" },
    { divider: true },
    { icon: List, cmd: "insertUnorderedList", label: "Liste" },
    { icon: ListOrdered, cmd: "insertOrderedList", label: "Liste numérotée" },
    { divider: true },
    { icon: AlignLeft, cmd: "justifyLeft", label: "Gauche" },
    { icon: AlignCenter, cmd: "justifyCenter", label: "Centre" },
    { icon: AlignRight, cmd: "justifyRight", label: "Droite" },
    { divider: true },
    { icon: Link, action: insertLink, label: "Lien" },
    { icon: Anchor, action: insertAnchor, label: "Ancre" },
    { icon: Image, action: insertImage, label: "Image" },
    { icon: Palette, action: changeColor, label: "Couleur" },
  ];

  const urlPrefix = pageType === "blog" ? "/blog/" : "/p/";

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement...</div>;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cms")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="h-5 w-px bg-border" />
          <Badge variant={pageType === "blog" ? "default" : "secondary"} className="text-xs">
            {pageType === "blog" ? "Article" : "Page"}
          </Badge>
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">{title || "Sans titre"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 mr-2">
            <Button
              variant={editorMode === "visual" ? "default" : "ghost"}
              size="sm"
              onClick={() => { if (editorMode === "html") setEditorMode("visual"); }}
              className="h-7 text-xs"
            >
              <Type className="h-3 w-3 mr-1" /> Visuel
            </Button>
            <Button
              variant={editorMode === "html" ? "default" : "ghost"}
              size="sm"
              onClick={() => { syncHtmlFromEditor(); setEditorMode("html"); }}
              className="h-7 text-xs"
            >
              <Code className="h-3 w-3 mr-1" /> HTML
            </Button>
          </div>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setShowRightPanel(!showRightPanel)}
            title="Panneau propriétés"
          >
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} className="h-7 text-xs">
            <Save className="h-3 w-3 mr-1" /> Brouillon
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate("published")} disabled={saveMutation.isPending} className="h-7 text-xs">
            <Globe className="h-3 w-3 mr-1" /> Publier
          </Button>
        </div>
      </div>

      {/* Main layout: toolbar + preview + properties */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        {editorMode === "visual" && (
          <div className="w-12 border-r border-border bg-card/30 flex flex-col items-center py-2 gap-0.5 overflow-y-auto shrink-0">
            {toolbarButtons.map((btn, i) =>
              btn.divider ? (
                <div key={i} className="w-6 h-px bg-border my-1" />
              ) : (
                <Button
                  key={i}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title={btn.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (btn.action) btn.action();
                    else if (btn.cmd) execCmd(btn.cmd, btn.value);
                  }}
                >
                  {btn.icon && <btn.icon className="h-3.5 w-3.5" />}
                </Button>
              )
            )}
          </div>
        )}

        {/* Center: Live preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-4xl mx-auto">
            {/* Simulated header */}
            <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={cronosLogo} alt="Cronos" className="h-6 w-6 rounded-lg" />
                <span className="font-display text-sm font-bold text-foreground">Cronos</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Accueil</span>
                <span>Aide</span>
                <span>Tarifs</span>
                <span>Connexion</span>
              </div>
            </div>

            {/* Content area */}
            <div className="px-6 py-8">
              <div className="max-w-3xl mx-auto">
                {/* Title input in preview */}
                <input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de la page"
                  className="w-full text-3xl md:text-4xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-2"
                />
                {pageType === "blog" && (
                  <p className="text-sm text-muted-foreground mb-6">
                    Publié le {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}

                {/* Editable content */}
                {editorMode === "visual" ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[400px] prose prose-lg max-w-none dark:prose-invert focus:outline-none"
                    onInput={syncHtmlFromEditor}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    suppressContentEditableWarning
                  />
                ) : (
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm border-border"
                    placeholder="<h1>Mon article</h1><p>Contenu...</p>"
                  />
                )}
              </div>
            </div>

            {/* Simulated footer */}
            <div className="border-t border-border/50 bg-card/30 px-6 py-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <img src={cronosLogo} alt="Cronos" className="h-4 w-4" />
                  <span className="font-semibold text-foreground">Cronos</span>
                </div>
                <span>© 2025 Cronos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: properties */}
        {showRightPanel && (
          <div className="w-72 border-l border-border bg-card/50 overflow-y-auto shrink-0">
            <div className="p-4 space-y-5">
              {/* Page type */}
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Type</Label>
                <Select value={pageType} onValueChange={(v: "blog" | "page") => setPageType(v)}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm">
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
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">URL</Label>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-xs text-muted-foreground shrink-0">{urlPrefix}</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-8 text-sm" placeholder="mon-article" />
                </div>
              </div>

              {/* Publication toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Publié</Label>
                <Switch
                  checked={status === "published"}
                  onCheckedChange={(checked) => setStatus(checked ? "published" : "draft")}
                />
              </div>

              <div className="h-px bg-border" />

              {/* SEO */}
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                  <Search className="h-3 w-3" /> SEO
                </Label>
              </div>

              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} className="mt-1 h-8 text-sm" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{(metaTitle || title).length}/60</p>
              </div>

              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Description pour les moteurs de recherche" rows={2} className="mt-1 text-sm" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{metaDescription.length}/160</p>
              </div>

              <div>
                <Label className="text-xs">Image OG</Label>
                <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." className="mt-1 h-8 text-sm" />
              </div>

              <div className="h-px bg-border" />

              {/* Google preview */}
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Aperçu Google</Label>
                <div className="mt-2 p-3 bg-background border border-border rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">
                    {metaTitle || title || "Titre de la page"}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500 truncate">
                    getcronos.fr{urlPrefix}{slug || "url"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {metaDescription || "Aucune description définie"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
