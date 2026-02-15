import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, Globe, Code, Type,
  Bold, Italic, Underline, List, ListOrdered, Link, Palette,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Anchor, Image
} from "lucide-react";

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
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");

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
      const anchor = `<a id="${name}" name="${name}"></a>`;
      document.execCommand("insertHTML", false, anchor);
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
        title,
        slug,
        content: htmlContent,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        og_image: ogImage || null,
        status: saveStatus,
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
    { icon: AlignLeft, cmd: "justifyLeft", label: "Aligner à gauche" },
    { icon: AlignCenter, cmd: "justifyCenter", label: "Centrer" },
    { icon: AlignRight, cmd: "justifyRight", label: "Aligner à droite" },
    { divider: true },
    { icon: Link, action: insertLink, label: "Lien" },
    { icon: Anchor, action: insertAnchor, label: "Ancre" },
    { icon: Image, action: insertImage, label: "Image" },
    { icon: Palette, action: changeColor, label: "Couleur" },
  ];

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin/cms")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Brouillon
          </Button>
          <Button onClick={() => saveMutation.mutate("published")} disabled={saveMutation.isPending}>
            <Globe className="h-4 w-4 mr-2" /> Publier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Titre de la page" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mon-article" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Contenu</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={editorMode === "visual" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { if (editorMode === "html") setEditorMode("visual"); }}
                  >
                    <Type className="h-4 w-4 mr-1" /> Visuel
                  </Button>
                  <Button
                    variant={editorMode === "html" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { syncHtmlFromEditor(); setEditorMode("html"); }}
                  >
                    <Code className="h-4 w-4 mr-1" /> HTML
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editorMode === "visual" ? (
                <>
                  <div className="flex flex-wrap gap-1 p-2 border border-border rounded-t-lg bg-muted/50">
                    {toolbarButtons.map((btn, i) =>
                      btn.divider ? (
                        <div key={i} className="w-px h-6 bg-border mx-1 self-center" />
                      ) : (
                        <Button
                          key={i}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={btn.label}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (btn.action) btn.action();
                            else if (btn.cmd) execCmd(btn.cmd, btn.value);
                          }}
                        >
                          {btn.icon && <btn.icon className="h-4 w-4" />}
                        </Button>
                      )
                    )}
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[400px] p-4 border border-t-0 border-border rounded-b-lg bg-background focus:outline-none prose prose-sm max-w-none dark:prose-invert"
                    onInput={syncHtmlFromEditor}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    suppressContentEditableWarning
                  />
                </>
              ) : (
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="<h1>Mon article</h1><p>Contenu...</p>"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar SEO */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Meta Title</Label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} />
                <p className="text-xs text-muted-foreground mt-1">{(metaTitle || title).length}/60</p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Description pour les moteurs de recherche" rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160</p>
              </div>
              <div>
                <Label>Image OG</Label>
                <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aperçu Google</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-card border border-border rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">
                  {metaTitle || title || "Titre de la page"}
                </p>
                <p className="text-xs text-green-700 dark:text-green-500 truncate">
                  votresite.com/blog/{slug || "url"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {metaDescription || "Aucune description définie"}
                </p>
              </div>
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prévisualisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert max-h-64 overflow-y-auto p-3 border border-border rounded-lg bg-background"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
