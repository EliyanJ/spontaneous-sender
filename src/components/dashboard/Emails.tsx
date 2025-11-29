import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Send, Mail } from "lucide-react";
import { EmailSearchSection } from "./EmailSearchSection";
import { EmailComposerSection } from "./EmailComposerSection";

export const Emails = () => {
  const [activeSection, setActiveSection] = useState<"search" | "compose">("search");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground">Emails</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Recherchez des contacts et composez vos emails
        </p>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "search" | "compose")}>
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="h-4 w-4" />
            Recherche d'emails
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Send className="h-4 w-4" />
            Composer un email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <EmailSearchSection onEmailsFound={() => setActiveSection("compose")} />
        </TabsContent>

        <TabsContent value="compose" className="mt-6">
          <EmailComposerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
