import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Send, ChevronRight, Sparkles, Users } from "lucide-react";
import { EmailSearchSection } from "./EmailSearchSection";
import { EmailComposerSection } from "./EmailComposerSection";
import { PersonalizedEmailsSection } from "./PersonalizedEmailsSection";

interface EmailsProps {
  onNavigateToTab?: (tab: string) => void;
}

export const Emails = ({ onNavigateToTab }: EmailsProps) => {
  const [activeSection, setActiveSection] = useState<"search" | "compose" | "personalized">("search");

  // Read initial section from sessionStorage (set by Index.tsx from URL params)
  useEffect(() => {
    const initialSection = sessionStorage.getItem('emails_initial_section');
    if (initialSection && ['search', 'compose', 'personalized'].includes(initialSection)) {
      setActiveSection(initialSection as "search" | "compose" | "personalized");
      sessionStorage.removeItem('emails_initial_section');
    }
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
        <TabsList className="bg-card/50 border border-border w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Trouver des contacts</span>
            <span className="sm:hidden">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm">
            <Send className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Email manuel</span>
            <span className="sm:hidden">Manuel</span>
          </TabsTrigger>
          <TabsTrigger value="personalized" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Email IA personnalisé</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <EmailSearchSection onEmailsFound={() => setActiveSection("compose")} />
        </TabsContent>

        <TabsContent value="compose" className="mt-6">
          <EmailComposerSection />
        </TabsContent>

        <TabsContent value="personalized" className="mt-6">
          <PersonalizedEmailsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
