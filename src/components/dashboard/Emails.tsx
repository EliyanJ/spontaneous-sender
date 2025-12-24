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
        <TabsList className="bg-card/50 border border-border w-full h-auto p-1 overflow-x-auto scrollbar-hide flex">
          <TabsTrigger value="search" className="gap-1.5 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-3 shrink-0 whitespace-nowrap">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Contacts</span>
            <span className="xs:hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-3 shrink-0 whitespace-nowrap">
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Manuel</span>
            <span className="xs:hidden sm:inline">Manuel</span>
          </TabsTrigger>
          <TabsTrigger value="personalized" className="gap-1.5 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-3 shrink-0 whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden xs:inline sm:hidden">IA</span>
            <span className="xs:hidden sm:inline">IA</span>
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
