import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { TemplateSchema } from "@/lib/cv-templates/extractSchema";
import type { DesignVars } from "@/lib/cv-templates/injectCSSVariables";
import type { ConstraintsMap } from "./ConstraintsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIPatch {
  type: "css_patch" | "html_patch" | "design_vars";
  description: string;
  patch: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  patch?: AIPatch;
  patchApplied?: boolean;
}

interface Props {
  templateHtml: string;
  templateSchema: TemplateSchema | null;
  designVars: DesignVars;
  constraints: ConstraintsMap;
  onApplyPatch: (patch: AIPatch) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPatch(content: string): { textContent: string; patch: AIPatch | null } {
  const regex = /```json\s*(\{[\s\S]*?"type"\s*:[\s\S]*?\})\s*```/;
  const m = content.match(regex);
  if (!m) return { textContent: content, patch: null };

  try {
    const patch = JSON.parse(m[1]) as AIPatch;
    if (!["css_patch", "html_patch", "design_vars"].includes(patch.type)) {
      return { textContent: content, patch: null };
    }
    const textContent = content.replace(m[0], "").trim();
    return { textContent, patch };
  } catch {
    return { textContent: content, patch: null };
  }
}

// ─── Sub-component: PatchCard ─────────────────────────────────────────────────

function PatchCard({ patch, onApply, applied }: { patch: AIPatch; onApply: () => void; applied: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel: Record<AIPatch["type"], string> = {
    css_patch: "Modification CSS",
    html_patch: "Modification HTML",
    design_vars: "Variables de design",
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="font-semibold">{typeLabel[patch.type]}</span>
          <span className="opacity-75 text-foreground">— {patch.description}</span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="opacity-60 hover:opacity-100 shrink-0 text-muted-foreground"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <pre className="font-mono text-[10px] bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap text-foreground">
          {patch.patch}
        </pre>
      )}

      {applied ? (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Appliqué
        </div>
      ) : (
        <Button size="sm" className="h-6 text-xs gap-1" onClick={onApply}>
          <CheckCircle2 className="h-3 w-3" />
          Appliquer
        </Button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const AIDesignChat: React.FC<Props> = ({
  templateHtml,
  templateSchema,
  designVars,
  constraints,
  onApplyPatch,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation() {
    setStarted(true);
    await sendMessage("", true);
  }

  async function sendMessage(userText: string, isInit = false) {
    const newMessages: Message[] = isInit
      ? []
      : [...messages, { role: "user" as const, content: userText }];

    if (!isInit) {
      setMessages(newMessages);
      setInput("");
    }

    setIsLoading(true);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-template-designer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          templateHtml,
          templateSchema,
          designVars,
          constraints,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: "Erreur inconnue" }));
        toast({ title: "Erreur IA", description: errData.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";
      let streamDone = false;

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: accumulated };
                }
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const { textContent, patch } = extractPatch(accumulated);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: textContent, patch: patch ?? undefined };
        }
        return updated;
      });

    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyPatch(msgIndex: number, patch: AIPatch) {
    onApplyPatch(patch);
    setMessages(prev =>
      prev.map((m, i) => i === msgIndex ? { ...m, patchApplied: true } : m)
    );
    toast({ title: "Modification appliquée ✓", description: patch.description });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) sendMessage(input.trim());
    }
  }

  if (!started) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Assistant Design IA</h3>
          <p className="text-xs text-muted-foreground max-w-52">
            L'IA analyse votre template et vous aide à le modifier : couleurs, polices, layout, CSS personnalisé…
          </p>
        </div>
        <Button onClick={startConversation} className="gap-2">
          <Bot className="h-4 w-4" />
          Démarrer la conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              {msg.content && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              )}
              {msg.patch && (
                <PatchCard
                  patch={msg.patch}
                  applied={msg.patchApplied ?? false}
                  onApply={() => handleApplyPatch(i, msg.patch!)}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Décrivez la modification souhaitée… (Entrée pour envoyer)"
          className="flex-1 min-h-[60px] max-h-32 text-xs resize-none"
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={() => input.trim() && sendMessage(input.trim())}
          disabled={isLoading || !input.trim()}
          className="h-9 w-9 shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
