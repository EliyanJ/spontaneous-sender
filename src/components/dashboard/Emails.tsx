import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send } from "lucide-react";
import { EmailSearchSection } from "./EmailSearchSection";
import { UnifiedEmailSender } from "./UnifiedEmailSender";

interface EmailsProps {
  onNavigateToTab?: (tab: string) => void;
}

export const Emails = ({ onNavigateToTab }: EmailsProps) => {
  const [activeSection, setActiveSection] = useState<"search" | "send">("search");

  // Read initial section from sessionStorage (set by Index.tsx from URL params)
  useEffect(() => {
    const initialSection = sessionStorage.getItem('emails_initial_section');
    if (initialSection) {
      // Map old section names to new ones
      if (['compose', 'personalized', 'cover-letter', 'send'].includes(initialSection)) {
        setActiveSection("send");
      } else if (initialSection === 'search') {
        setActiveSection("search");
      }
      sessionStorage.removeItem('emails_initial_section');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground">Emails</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Recherchez des contacts et envoyez vos candidatures
        </p>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "search" | "send")}>
        <TabsList className="bg-card/50 border border-border w-full h-auto p-1">
          <TabsTrigger 
            value="search" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1"
          >
            <Users className="h-4 w-4" />
            <span>Trouver des contacts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="send" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1"
          >
            <Send className="h-4 w-4" />
            <span>Envoyer des candidatures</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <EmailSearchSection onEmailsFound={() => setActiveSection("send")} />
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <UnifiedEmailSender />
        </TabsContent>
      </Tabs>
    </div>
  );
};
