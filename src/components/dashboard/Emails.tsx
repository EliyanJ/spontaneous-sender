import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Send, Mail, ChevronRight, Sparkles } from "lucide-react";
import { EmailSearchSection } from "./EmailSearchSection";
import { EmailComposerSection } from "./EmailComposerSection";
import { PersonalizedEmailGenerator } from "./PersonalizedEmailGenerator";

interface EmailsProps {
  onNavigateToTab?: (tab: string) => void;
}

export const Emails = ({ onNavigateToTab }: EmailsProps) => {
  const [activeSection, setActiveSection] = useState<"search" | "compose" | "personalized">("search");

  // Listen for personalized email load events
  useEffect(() => {
    const handleLoadPersonalizedEmail = (event: CustomEvent) => {
      const { subject, body, recipient } = event.detail;
      // Dispatch to composer
      window.dispatchEvent(new CustomEvent('set-composer-content', {
        detail: { subject, body, recipient }
      }));
      setActiveSection("compose");
    };

    window.addEventListener('load-personalized-email', handleLoadPersonalizedEmail as EventListener);
    return () => window.removeEventListener('load-personalized-email', handleLoadPersonalizedEmail as EventListener);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Emails</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Recherchez des contacts et composez vos emails
          </p>
        </div>
        {onNavigateToTab && (
          <Button onClick={() => onNavigateToTab('campaigns')} className="gap-2">
            Voir les campagnes
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "search" | "compose" | "personalized")}>
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="h-4 w-4" />
            Recherche d'emails
          </TabsTrigger>
          <TabsTrigger value="personalized" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="h-4 w-4" />
            Email personnalisé
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Send className="h-4 w-4" />
            Composer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <EmailSearchSection onEmailsFound={() => setActiveSection("compose")} />
        </TabsContent>

        <TabsContent value="personalized" className="mt-6">
          <PersonalizedEmailGenerator />
        </TabsContent>

        <TabsContent value="compose" className="mt-6">
          <EmailComposerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
