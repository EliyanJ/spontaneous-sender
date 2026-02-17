import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageCircle,
  Loader2,
  Send,
  CheckCircle,
  HelpCircle,
  Bot,
  TicketIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-assistant`;

export const ChatbotWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "👋 Bonjour ! Je suis l'assistant Cronos. Comment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ticket state
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const input = chatInput.trim();
    if (!input || isStreaming) return;

    const userMsg: Msg = { role: "user", content: input };
    setChatInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && assistantSoFar.startsWith(last.content.slice(0, 5))) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const allMessages = [...messages, userMsg].filter(
        (m) => m.content !== "👋 Bonjour ! Je suis l'assistant Cronos. Comment puis-je vous aider aujourd'hui ?"
      );

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages.slice(-20) }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erreur du service");
      }

      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }

      if (!assistantSoFar) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Désolé, je n'ai pas pu générer de réponse. Réessayez." },
        ]);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Chat error:", e);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ Une erreur est survenue. Réessayez ou créez un ticket de support.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un ticket");
      return;
    }
    if (!subject.trim() || !description.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setTicketLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          current_page: location.pathname,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      try {
        await supabase.functions.invoke("send-system-email", {
          body: {
            type: "ticket_notification",
            subject: subject.trim(),
            description: description.trim(),
            currentPage: location.pathname,
            userEmail: user.email,
            userId: user.id,
          },
        });
        await supabase.functions.invoke("send-system-email", {
          body: {
            type: "ticket_confirmation",
            to: user.email,
            subject: subject.trim(),
            ticketId: ticketData?.id,
          },
        });
      } catch {}

      setTicketSubmitted(true);
      toast.success("Ticket envoyé !");
      setTimeout(() => {
        setTicketSubmitted(false);
        setSubject("");
        setDescription("");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setTicketLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          variant="default"
          size="icon"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] sm:h-[560px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Assistance Cronos</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="w-full rounded-none border-b shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1.5 text-xs">
                <Bot className="h-3.5 w-3.5" />
                Assistant IA
              </TabsTrigger>
              <TabsTrigger value="ticket" className="flex-1 gap-1.5 text-xs">
                <TicketIcon className="h-3.5 w-3.5" />
                Ticket
              </TabsTrigger>
            </TabsList>

            {/* Chat tab */}
            <TabsContent
              value="chat"
              className="flex-1 flex flex-col m-0 min-h-0"
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&>p+p]:mt-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t px-3 py-2 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Posez votre question..."
                    disabled={isStreaming}
                    className="text-sm h-9"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={isStreaming || !chatInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* Ticket tab */}
            <TabsContent
              value="ticket"
              className="flex-1 overflow-y-auto m-0 px-4 py-3"
            >
              {ticketSubmitted ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <CheckCircle className="h-16 w-16 text-primary" />
                  <p className="text-lg font-medium text-center">
                    Ticket envoyé !
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Nous vous répondrons dès que possible.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                    Envoyez-nous un message, nous vous répondrons rapidement.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-subject" className="text-sm">
                      Sujet
                    </Label>
                    <Input
                      id="ticket-subject"
                      placeholder="Décrivez brièvement votre problème"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={ticketLoading}
                      maxLength={200}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-desc" className="text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="ticket-desc"
                      placeholder="Donnez-nous plus de détails..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={ticketLoading}
                      rows={4}
                      maxLength={2000}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {description.length}/2000
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    📍 Page : <code>{location.pathname}</code>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={ticketLoading}
                  >
                    {ticketLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer le ticket
                      </>
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
};
